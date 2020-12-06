var cvs,
    ctx,
    player,
    food,
    cells = Object.create({
        mine: [],
        byId: {},
        list: []
    }),
    food = Object.create({
        byId: {}
    }),
    zoom = 1,
    mx = 100,
    my = 100;

function Cell(x, y, s, id) {
    this.x = x;
    this.y = y;
    this.color = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`
    this.id = id;
    this.s = s;
}

Cell.prototype = {
    draw: function () {
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, this.s, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();
    }
}

function Food(x, y, id) {
    this.x = x;
    this.y = y;
    this.s = 10;
    this.color = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`
    this.id = id;
}

Food.prototype = {
    draw: function () {
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, 10, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();
    }
}


function setup() {
    cvs = document.getElementById('game');
    cvs.width = innerWidth;
    cvs.height = innerHeight;
    ctx = cvs.getContext('2d');
    var loop = () => {
        draw();
        requestAnimationFrame(loop);
    }
    loop();
}
setup();
function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end
}
function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#353b48';
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    var drawList = [];
    if (player) {
        let newZoom = 64 / player.s;
        zoom = lerp(zoom, newZoom, 0.1)
        ctx.translate(innerWidth / 2, innerHeight / 2)
        ctx.scale(zoom, zoom)
        ctx.translate(-player.x, - player.y)
        for (let i = 0; i < cells.mine.length; i++) {
            const element = cells.mine[i];
            drawList.push(element);
        }
        ctx.strokeStyle = 'orange';
        ctx.strokeRect(0, 0, 7000,7000)
    }
    for (const foods in food.byId) {
        if (food.byId.hasOwnProperty(foods)) {
            const element = food.byId[foods];
            drawList.push(element);
        }
    }
    for (const cell in cells.byId) {
        if (cells.byId.hasOwnProperty(cell)) {
            const element = cells.byId[cell];
            drawList.push(element);
        }
    }
    let list = drawList.sort((a,b) => {return a.s - b.s});
    for (let i = 0; i < list.length; i++) {
        const element = list[i];
        element.draw();
    }
}

function hideOverlay(){
    document.getElementsByClassName('overlay')[0].style.display = 'none';
    document.getElementsByClassName('bg')[0].style.display = 'none';
}

cvs.onmousemove = e => {
   
     mx = e.clientX - innerWidth / 2;
     my = e.clientY - innerHeight / 2

    //console.log(mx, my);
}
setInterval(() => {
   if(ws){
    let msg = prepare(1 + 2 + 2);
    msg.setUint8(0, 12);
    msg.setInt16(1, mx)
    msg.setInt16(3, my)
    wsSend(msg);
} 
}, 40);

let host = location.href.replace(/^http/, 'ws');
let ws = new WebSocket(host);
ws.binaryType = 'arraybuffer'
ws.onopen = () => {
    sendmsg(1)
  //  wsSend({ e: 'new' });
}
ws.onclose = () => {

}
ws.onmessage = data => {
    let msg = new DataView(data.data);
   // console.log(msg)
    let opcode = msg.getUint8(0);
    //console.log(opcode)
    switch (opcode) {
        case
        10:
            let count = msg.getUint16(1);
            let xoffset = 3,
                yoffset = 5,
                soffset = 7,
                idoffset = 9,
                flagoffset = 11
            for (let i = 0; i < count; i++) {
                let x = msg.getInt16(xoffset)
                xoffset += 9;
                let y = msg.getInt16(yoffset);
                yoffset += 9;
                let s = msg.getUint16(soffset);
                soffset += 9;
                let pid = msg.getUint16(idoffset);
                idoffset += 9;
                let flag = msg.getUint8(flagoffset);
                if (flag == 10)/*cell*/ {
                    if (!cells.byId.hasOwnProperty(pid)) {
                        cells.byId[pid] = new Cell(x, y, s, pid);
                    } else {
                        let cell = cells.byId[pid];
                        cell.x = lerp(cell.x, x, 0.3);
                        cell.y = lerp(cell.y, y, 0.3);
                        cell.s = lerp(cell.s, s, 0.3);
                    }
                } else {
                    if (!food.byId.hasOwnProperty(pid)) {
                        food.byId[pid] = new Food(x, y, pid);
                    }
                };
                flagoffset += 9;
             //  console.log(flag);
            }
        break;
        case
            47:
           // console.log(msg)
           let kid = msg.getUint16(1);
            if (cells.byId.hasOwnProperty(kid)) {
                delete cells.byId[kid];
            }
            if (food.byId.hasOwnProperty(kid)) {
                //console.log('true')
                delete food.byId[kid];
            }
            break;
        case
            51:
           let cx =  msg.getInt16(1)
           let cy =  msg.getInt16(3);
           let cs =  msg.getUint16(5);
           let cid =  msg.getUint16(7);
            player = new Cell(cx, cy, cs, cid);
            cells.mine.push(player);
            break;
        case
            12:
            if(player){
            player.x = lerp(player.x, msg.getInt16(1), 0.3)
            player.y = lerp(player.y, msg.getInt16(3), 0.3)
            player.s = lerp(player.s, msg.getUint16(5), 0.1)
            //console.log(player.x, player.y, player.s)
            }
        }
}
var wsSend = data => {
    ws.send(data.buffer);
}



function prepare(a){
    return new DataView(new ArrayBuffer(a));
}
function sendmsg(a){
    let msg = new Uint8Array([a]);
    wsSend(msg);
}

function startGame(){
    sendmsg(99);
}

