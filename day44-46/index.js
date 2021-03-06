let menu = [
    {name: '鱼香肉丝', cost: 15, sale: 30},
    {name: '红烧排骨', cost: 25, sale: 50},
    {name: '宫保鸡丁', cost: 20, sale: 40},
    {name: '烧鸭', cost: 20, sale: 40},
    {name: '白切鸡', cost: 20, sale: 40},
    {name: '番茄炒鸡蛋', cost: 10, sale: 20},
    {name: '番茄鸡蛋汤', cost: 10, sale: 20},
    {name: '水煮鱼', cost: 25, sale: 50},
    {name: '清蒸金枪鱼', cost: 25, sale: 50},
    {name: '卤猪脚', cost: 20, sale: 40},
    {name: '苦瓜炒鸡蛋', cost: 10, sale: 20},
    {name: '炒芥兰', cost: 10, sale: 20},
    {name: '炒空心菜', cost: 10, sale: 20},
    {name: '香菇炒鸡肉', cost: 20, sale: 40},
    {name: '卤鸭', cost: 20, sale: 40},
    {name: '红萝卜炒肉', cost: 15, sale: 30},
    {name: '紫菜肉沫汤', cost: 15, sale: 30},
    {name: '红烧牛肉', cost: 25, sale: 50}
];
// 餐厅类
class Restaurant
{
    constructor({cash, seat, msgContentId})
    {
        let restaurant =this;
        this.cash = cash;           // 现金
        this.msgContent = document.querySelector(msgContentId);
        this.msgWrapper = this.msgContent.parentNode;
        this.menu  = [];         // 餐厅菜单
        this.queue = [];        //  队列
        this.handler = [];
        // 职员
        this.staff = (function () {
            let staff = [];
            return {
                // 雇佣职员
                hire: person => {
                    let sameProfessionEmployee;
                    if (staff.length > 0) {
                        // 只雇佣一个职员
                        sameProfessionEmployee = staff.find(employee => employee.constructor.name === person.constructor.name);
                    }
                    // 没有雇佣过
                    if (!sameProfessionEmployee) {
                        staff.push(person);
                      restaurant.emit('hireemployee', person)
                    }

                },
                // 解雇职员
                fire: person => {
                    if (staff.length > 0)  {
                        staff.forEach((employee, idx) => {
                            if (employee === person) {
                                staff.splice(idx, 1);
                                restaurant.emit('fireemployee', person)
                            }
                        })
                    }
                },
                getStaff: ()=> {
                    return staff.concat();
                },
                getCook: () => {
                    return staff.find(employee => employee.constructor.name == 'Cook');
                },
                getWaiter: () => {
                    return staff.find(employee => employee.constructor.name == 'Waiter');
                },
            }
        }());
        // 餐厅座位
        this.seat = (function (restaurant, amount) {
            let seat = [];
            return {
                sitIn: customer => {
                    seat.push(customer);
                    restaurant.emit('customersitdown', customer);
                },
                leave: count => {
                    seat.shift();
                    restaurant.emit('customerleave', restaurant);
                },
                getCustomer: () => seat[0]
            }
        }(this, seat));
        this.addListener();
        this.emit('becreated', restaurant);
    }
    addListener(){
        let restaurant = this;

        //餐厅已经创建
        this.watch('becreated', ()=>{
            restaurant.sendMessage('restaurant', 'The restaurant has been created!');
        });

        // 餐厅雇佣了...
        this.watch('hireemployee', employee =>{
            restaurant.sendMessage('restaurant', `The restaurant hired the employee ${employee.name}!`);
        });

        // 餐厅解雇了...
        this.watch('fireemployee', employee =>{
            restaurant.sendMessage('restaurant', `The restaurant fired the employee ${employee.name}!`);
        });

        // 顾客已就坐
        this.watch('customersitdown', customer =>{
            restaurant.sendMessage('restaurant', 'Customer has sit down!');
            // 调用自己的点菜
            customer.order(restaurant);
        });

        // 客户离开了，座位已空
        this.watch('customerleave', restaurant =>{
            restaurant.sendMessage('restaurant', 'Customer has left!')
            restaurant.sendMessage('restaurant', 'The seat is empty!')
            // 下个顾客
            restaurant.seat.sitIn(restaurant.queue.shift());
        });

        // 顾客点菜
        this.watch('orderedfoods', customer =>{
            let orderedFood = customer.ordered.concat();
            let waiter = restaurant.staff.getWaiter();

            restaurant.sendMessage('restaurant', 'Customer has ordered foods!');
            restaurant.sendMessage('restaurant', `Foods are ${orderedFood.reduce((string, food) => {
                string += ` ${food.name} `;
                return string;
            }, '')}`);

            waiter.work(restaurant, orderedFood);
        });

        // 服务员拿到菜单
        this.watch('gotthemenu', foods =>{
            let cook = restaurant.staff.getCook();

            restaurant.sendMessage('restaurant', 'Waiter has got the menu!')

            cook.work(restaurant, foods);
        });

        // 开始炒菜
        this.watch('cookedfood', food =>{
            let waiter = restaurant.staff.getWaiter();

            restaurant.sendMessage('restaurant', `The food ${food.name} has been cooked!`);

            waiter.work(restaurant, food);
        });

        // 服务员上菜
        this.watch('servedfood', food =>{
            let customer = restaurant.seat.getCustomer();

            restaurant.sendMessage('restaurant', `Waiter has served the food ${food.name}!`);

            customer.eat(restaurant, food);
        });
        // 顾客吃菜
        this.watch('eatedfood', food =>{
            restaurant.sendMessage('restaurant', `Customer has eated the food ${food.name}!`);
        })
    }
    addFoods(foods){
        this.menu.push(...foods);
        this.sendMessage('restaurant', 'The restaurant added food menu!');
    }
    queueUp(...people){
        this.queue.push(...people);
    }
    start(){
        this.sendMessage('restaurant', 'The restaurant is open!')
        this.seat.sitIn(this.queue.shift());
    }
    watch(type, fn) {
        if (!this.handler[type]) {
            this.handler[type] = [];
        }
        this.handler[type].push(fn);
    }
    emit(type, restaurant) {
        if (this.handler[type]) {
            this.handler[type].forEach(fn => fn(restaurant));
        }
    }
    sendMessage(writer, msg) {
        let li = createElm(`<li><b>${writer}:</b>${msg}</li>`);
        this.msgContent.appendChild(li);
        let scrollHeight =this.msgWrapper.scrollHeight;
        this.msgWrapper.scrollTo(0, scrollHeight);
        function createElm(string) {
            let div = document.createElement("div");
            div.innerHTML = string;
            return div.children[0];
        }
    }
}

class Staff {
    constructor(name, salary, work) {
        this.name  = name;
        this.salary = salary;
        this.work = work;
    }
}

class Waiter extends Staff{
    constructor(name, salary) {
        let  work = function (restaurant, arg) {
            if (Array.isArray(arg)) {
                restaurant.emit('gotthemenu', arg);
            } else {
                restaurant.emit('servedfood', arg);
            }
        };
        super(name, salary, work);
    }
}

class Cook extends Staff {
    constructor(name, salary) {
        let  work = function (restaurant, foods) {
            let timer = setInterval(function(){
                restaurant.emit('cookedfood', foods.shift());
                if(foods.length === 0) clearInterval(timer);
            },5000);
        };
        super(name, salary, work);
    }
}

class Food{
    constructor({name, cost, sale}){
        this.name= name;
        this.cost = cost;
        this.sale = sale;
    }
}

class Customer {
    constructor() {
        this.ordered = [];
    }
    order(restaurant) {
        let self =this;
        let randomNumber = Math.floor(Math.random() * 5);
        let count = randomNumber === 0?1:randomNumber;
        for (let i=0; i<count; i++) {
            let randomNumber = Math.floor(Math.random() * restaurant.menu.length)
            let food = restaurant.menu[randomNumber === 0? 1:randomNumber];
            this.ordered.push(food);
        }
        setTimeout(function () {
            restaurant.emit('orderedfoods', self);
        }, 5000);
    }
    eat(restaurant, food) {
        for(let i=0; i<this.ordered.length; i++) {
            if (this.ordered[i].name === food.name) {
                this.ordered.splice(i,1);
                restaurant.emit('eatedfood', food);
                break;
            }
        }
        if(this.ordered.length === 0) setTimeout(restaurant.seat.leave(),);
    }
}

//单例模式
function getSingle(fn) {
    let staff;
    return function (...args) {
        return staff || (staff = new fn(...args));
    }
}

let createSingleWaiter = getSingle(Waiter);
let createSingleCook = getSingle(Cook);

let chinaFoodR = new Restaurant({cash:20000, seat: 1, msgContentId: '.msgContainer ul'});
let waiter = createSingleWaiter('John', 2000);
let cook = createSingleCook('Sean', 4000);
let foods = menu.map(food => new Food(food));

chinaFoodR.staff.hire(waiter);
chinaFoodR.staff.hire(cook);
chinaFoodR.addFoods(foods);
for (let i=0; i< 200; i++) {
    chinaFoodR.queueUp(new Customer());
}
chinaFoodR.start();





































