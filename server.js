var express = require('express');
var compression = require('compression');
const WebSocket = require('ws').Server;
var app = express();
var server = app.listen(process.env.PORT || 7777, listen);
function listen() {
    var host = server.address().address;
    var port = server.address().port;
}
app.use(compression());
app.use(express.static('www'));

let world = {
    x : 7000,
    y : 7000
}
let fps = 60;
let cells = new Map;
let foods = [];
class Player {
    constructor(ws, x, y, id) {
        this.ws = ws;
        this.x = x;
        this.y = y;
        this.id = id;
        this.s = 64;
        this.speed = this.clamp( 128 / this.s, 0, 5);
        this.drawables = {};
        this.flags = 10;
        this.mouseX = 100;
        this.mouseY = 100;
    }
 clamp(num, min, max) {
    return num <= min ? min : num >= max ? max : num;
}
    eat(food) {
        let x = food.x - this.x;
        let y = food.y - this.y;
        let d = Math.sqrt(x * x + y * y);
        if (d < this.s + food.s) {
            this.s +=  food.s / 8;// default 8
            return true;
        } else {
            return false;
        }
    }
    drawable(other) {
        let d = Math.sqrt(Math.pow(this.x - other.x, 2), Math.pow(this.y - other.y, 2))
        if (d < this.clamp(this.s * 8, 0, 1000)) {
            return true;
        } else {
            return false;
        }
    }
    update() {
        var mouse = {
            x: this.mouseX,
            y: this.mouseY
        }
        var vel = Math.sqrt(Math.pow(mouse.x, 2) + Math.pow(mouse.y, 2));
        this.x += mouse.x / vel * this.speed;
        this.y += mouse.y / vel * this.speed;
        this.x = this.clamp(this.x, 0 + this.s, world.x - this.s)
        this.y = this.clamp(this.y, 0 + this.s, world.y - this.s)
        //console.log(this.x);
    }
}

class Food {
    constructor(x, y, id) {
        this.x = x;
        this.y = y;
        this.s = 10;
        this.id = id;
        this.flags = 20;
    }
}

var setup = () => {
    for (let i = 0; i < 1000; i++) {
        let food = new Food(Math.random() * world.x, Math.random() * world.y, createId());
        foods[i] = food;
    }
}

setup();
let wss = new WebSocket({ server });

wss.on('connection', ws => {
    let player;
    ws.binaryType = 'arraybuffer';
    ws.onmessage = data => {
    //    console.log(data.data)
        let msg = new DataView(data.data);
        let opcode = msg.getUint8(0);
        switch (opcode) {
            case
                1:
    
                player = new Player(ws, Math.random() * world.x, Math.random() * world.y, createId());
                cells.set(player.id, player);
              //  console.log(player);

                setInterval(() => {
                    for (let i = 0; i < foods.length; i++) {
                        const element = foods[i];
                        if (player.drawable(element)) {
                            if (!player.drawables.hasOwnProperty(element.id)) {
                                player.drawables[element.id] = {
                                    x: element.x,
                                    y: element.y,
                                    id: element.id,
                                    flag: element.flags
                                };
                            }
                        } else {

                            delete player.drawables[element.id];

                        }
                        if (player.eat(element)) {
                          //  console.log('eatr')
                            foods.splice(i, 1);
                            cells.forEach(e => {
                                if (e.drawables.hasOwnProperty(element.id)) {
                                    delete e.drawables[element.id];
                                   //console.log('wokrd')
                                   let msg = prepare(1 + 2);
                                   msg.setUint8(0, 47);
                                   msg.setUint16(1, element.id)
                                     wsSend(e.ws, msg);
                                    
                                }
                            })
                            foods.push(new Food(Math.random() * world.x, Math.random() * world.y, createId()));
                        }
                    }
                    cells.forEach(element => {
                        if (player.drawable(element) && element.id != player.id) {
                            if (!player.drawables.hasOwnProperty(element.id)) {
                                player.drawables[element.id] = {
                                    x: element.x,
                                    y: element.y,
                                    s: element.s,
                                    id: element.id,
                                    flag: element.flags
                                }
                            } else {
                                let cell = player.drawables[element.id];
                                cell.x = element.x;
                                cell.y = element.y;
                                cell.s = element.s;
                            }
                        }
                    })


                }, 1000 / fps);//60

                setInterval(() => {
                    let ab = prepare(1 + 2 + 2 + 2);
                    ab.setUint8(0, 12);
                    ab.setInt16(1, player.x)
                    ab.setInt16(3, player.y);
                    ab.setUint16(5, player.s);
                   // console.log(player.x, player.y, player.s)
                    wsSend(ws, ab);

                    let count = 0;
                    for (const key in player.drawables) {
                        if (player.drawables.hasOwnProperty(key)) {
                            const element = player.drawables[key];
                            if (element.flag == 10) {
                                count++;
                            }
                        }
                    }
                    var dv = prepare(1 + 2 + count * 9)
                    dv.setUint8(0, 10);
                    dv.setUint16(1, count);
                    let xoffset = 3,
                        yoffset = 5,
                        soffset = 7,
                        idoffset = 9,
                        flagoffset = 11
                    for (const key in player.drawables) {
                        if (player.drawables.hasOwnProperty(key)) {
                            const element = player.drawables[key];
                            if (element.flag == 10) {
                                dv.setInt16(xoffset, (element.x))
                                xoffset += 9;
                                dv.setInt16(yoffset, (element.y));
                                yoffset += 9;
                                dv.setUint16(soffset, (element.s));
                                soffset += 9;
                                dv.setUint16(idoffset, element.id);
                                idoffset += 9;
                                dv.setUint8(flagoffset, element.flag)
                                flagoffset += 9;
                            }
                            // console.log(element)
                        }
                    }
                    wsSend(ws, dv);
                    
               //     wsSend(ws, { e: 'mouse', x: player.x, y: player.y, s: player.s })
                //    wsSend(ws, { e: 'node', list: player.drawables })
                },40);//40
                setInterval(() => {
                    let count = 0;
                    for (const key in player.drawables) {
                        if (player.drawables.hasOwnProperty(key)) {
                            const element = player.drawables[key];
                            if (element.flag == 20) {
                                count++;
                            }
                        }
                    }
                    var dv = prepare(1 + 2 + count * 9)
                    dv.setUint8(0, 10);
                    dv.setUint16(1, count);
                    let xoffset = 3,
                        yoffset = 5,
                        soffset = 7,
                        idoffset = 9,
                        flagoffset = 11
                    for (const key in player.drawables) {
                        if (player.drawables.hasOwnProperty(key)) {
                            const element = player.drawables[key];
                            if (element.flag == 20) {
                                dv.setInt16(xoffset, (element.x))
                                xoffset += 9;
                                dv.setInt16(yoffset, (element.y));
                                yoffset += 9;
                                dv.setUint16(soffset, (element.s));
                                soffset += 9;
                                dv.setUint16(idoffset, element.id);
                                idoffset += 9;
                                dv.setUint8(flagoffset, element.flag)
                                flagoffset += 9;
                            }
                            // console.log(element)
                        }
                    }
                    wsSend(ws, dv);
                }, 1000);
            break;
            case
                99:
                setInterval(() => {
                    player.update();
                }, 1000 / fps);
                let sa = prepare(1 + 2 + 2 + 2 + 2);
                sa.setUint8(0, 51);
                sa.setInt16(1, player.x)
                sa.setInt16(3, player.y);
                sa.setUint16(5, player.s);
                sa.setUint16(7, player.id);
               // console.log(player.x, player.y, player.s)
                wsSend(ws, sa);//new


              //  wsSend(ws, { e: 'new', id: player.id, x: player.x, y: player.y, s: player.s })
                break;
            case
                12:
                let mx = msg.getInt16(1);
                let my = msg.getInt16(3);
                player.mouseX = mx;
                player.mouseY = my;
        }
    }

    ws.onclose = () => {
        cells.delete(player.id);
        cells.forEach(element => {
            if (element.drawables.hasOwnProperty(player.id)) {
                delete element.drawables[player.id];
                let msg = prepare(1 + 2);
                msg.setUint8(0, 47);
                msg.setUint16(1, player.id)
                wsSend(element.ws, msg);
               // wsSend(element.ws, { e: 'disappear', id: player.id })
            }
        })
    }
})

function wsSend(ws, data) {
    ws.send(data.buffer);
}

function createId() {
    let id = Math.floor(Math.random() * 65535);
    return id;
}

function prepare(a) {
    return new DataView(new ArrayBuffer(a));
}