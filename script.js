let canvas = document.getElementById('canvas');

let ctx = canvas.getContext("2d");
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

const modes = {setStart: "setStart", setEnd : "setEnd", addWalls : "addWalls"};

function setMode(){
    for(let field of Object.keys(modes)){
        document.getElementById(field).classList.remove('selectedMode');
    }
    document.getElementById(currentMode).classList.add('selectedMode');
}

let currentMode = modes.setStart;
setMode();

let gridSize = parseInt(document.getElementById("sizeField").innerText);
const cellWidth = canvasWidth/gridSize;
const cellHeight = canvasHeight/gridSize;


let start = {row: 0, col : 0};
let target = {row: gridSize -1, col: gridSize -1};
let grid = initGrid(gridSize);

let animate = true;

for(let field of Object.keys(modes)){
    document.getElementById(field).addEventListener('click', (event) => {
        console.log(event);
        currentMode = event.target.id;
        setMode();
    });
}

document.getElementById('animate').addEventListener('click', async (event) => {
    let result = aStar();
    animate = true;
    console.log(JSON.stringify(result, null, 2));
    await animateSearch(result);
});


function drawGrid(grid){
    ctx.clearRect(0,0, canvasWidth, canvasHeight);


    ctx.strokeStyle = 'orange';
    
    for(let row = 0; row < gridSize; row++){
        for(let col = 0; col < gridSize; col++){

            ctx.strokeRect(col*cellWidth, row*cellHeight, cellWidth, cellHeight)
            if(grid[row][col] == 's'){
                ctx.fillStyle = 'green';
                ctx.fillRect(col*cellWidth, row*cellHeight, cellWidth, cellHeight);
            }
            if(grid[row][col] == 't'){
                ctx.fillStyle = 'red';
                ctx.fillRect(col*cellWidth, row*cellHeight, cellWidth, cellHeight);
            }
            
        }
    }
}

            
function initGrid(size){
    let grid = Array(size).fill().map(() => Array(size).fill(' '));
    start = {row:0, col: 0};
    target = {row: gridSize -1, col: gridSize -1};
    grid[start.row][start.col] = 's';
    grid[target.row][target.col] = 't';
    drawGrid(grid);
    return grid;
}

canvas.addEventListener('click', (event)=>{
    animate = false;
    if(currentMode == modes.setStart){
        grid[start.row][start.col] = ' ';
        start = getCell(event, cellWidth, cellHeight);
        grid[start.row][start.col] = 's';
        drawGrid(grid);
    } else if(currentMode == modes.setEnd){
        grid[target.row][target.col] = ' ';
        target = getCell(event, cellWidth, cellHeight);
        grid[target.row][target.col] = 't';
        drawGrid(grid);

    }

});

function getCell(event, cellWidth, cellHeight){
    const target = event.target;

    // Get the bounding rectangle of target
    const rect = target.getBoundingClientRect();

    // Mouse position
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return {row : Math.trunc(y/cellHeight), col : Math.trunc(x/cellWidth)};
}


class PQueue {

    #data
    #indices
    #score;
    constructor(scoreFunc){
        this.#indices = new Map();
        this.#data  = [];
        this.#score = scoreFunc;
    }

    swap(i, j){
        this.#indices.set(this.#data[i], j);
        this.#indices.set(this.#data[j],  i);
        let tmp = this.#data[i];
        this.#data[i] = this.#data[j];
        this.#data[j] = tmp;
    }
    
    percolateDown(i) {
        while(true) {

            let leftIndex = this.leftIndex(i);
            let rightIndex = this.rightIndex(i);
            if(leftIndex >= this.#data.length) break; //no children

            let val = this.#data[i];
            let left = this.getLeft(i);
            let right = this.getRight(i);

            let valScore = this.#score(val);
            let leftScore = left != null ? this.#score(left) : 0;
            let rightScore = right != null ? this.#score(right) : 0;
            
            let couldGoLeft = left != null && valScore > leftScore;
            let couldGoRight = right != null && valScore > rightScore;

            if (couldGoLeft) {
                if (couldGoRight) {
                    //choose smaller one
                    if(leftScore < rightScore){ //swap with left
                        
                        this.swap(i, leftIndex);
                        i = leftIndex;
                    } else {
                        this.swap(i, rightIndex);
                        i = rightIndex;
                    }
                } else { //left only
                    this.swap(i, leftIndex);
                    i = leftIndex;
                }
            } else if(couldGoRight){
                this.swap(i, rightIndex);
                i = rightIndex;
            } else { //bigger than both or bigger than left and right is null
                break;
            }
        }

    }

    leftIndex(i ){
        return 2*i + 1;
    }
    rightIndex( i ){
        return 2*i + 2;
    }

    parentIndex( i){
        return Math.trunc((i -1)/2);
    }

    getRight( i) {
        let index = this.rightIndex(i);
        return index < this.#data.length ? this.#data[index] : null;
    }

    getLeft( i) {
        let index = this.leftIndex(i);
        return index < this.#data.length ? this.#data[index] : null;
    }


    add(elem) {
        this.#data.push(elem);
        this.#indices.set(elem,this.#data.length -1);
        this.percolateUp(this.#data.length -1);
    }

    percolateUp( i) {

        
        while(i != 0 && this.#score(this.#data[i]) < this.#score(this.#data[this.parentIndex(i)])){
            let pi = this.parentIndex(i);
            this.swap(i, pi);
            i = pi;
        }
    }


    removeMin() {
        let ret = this.#data[0];
        this.#data[0] = this.#data[this.#data.length - 1];
        this.#data.pop();
        this.percolateDown(0);
        return ret;
    }

    empty() {
        return this.#data.length == 0;
    }

    decreaseKey(elem){
        let index = this.#indices.get(elem);
        this.percolateUp(index);
    }

    print(){
        console.log(this.#data.toString());
        console.log(JSON.stringify(this.#indices));
    }

    
}

function score(node){
    return node;
}


function l2Dist(node){
    let dr = target.row - node.row;
    let dc = target.col - node.col;
    return Math.sqrt(dr*dr + dc*dc);
}


function nodeToString(node){
    return JSON.stringify(node);
}

function stringToNode(str){
    return JSON.parse(str);
}


function aStar(){

    let explorationLog = [];
    
    let nodeData = new Map();
    let score = (x) => {
        return nodeData.get(x).fScore + l2Dist(stringToNode(x), target);
    }
    let frontier = new PQueue(score);

    let startString = nodeToString(start);
    nodeData.set(startString, {cameFrom: start, fScore: 0});
    frontier.add(startString);

    while(!frontier.empty()){
        let nString = frontier.removeMin();
        console.log("exploring " + nString);
        let n = stringToNode(nString);
        explorationLog.push(n);
        if(n.row == target.row && n.col == target.col){
            console.log([...nodeData.entries()]);

            let path = [];
            let curr = n;
            while(curr.row != start.row || curr.col != start.col){
                console.log("curr: " + nodeToString(curr));
                path.push(curr);
                curr = nodeData.get(nodeToString(curr)).cameFrom;
            }
            path.push(start);
            path.reverse();
            
            return { log: explorationLog, path};
        }
        let thisFScore = nodeData.get(nString).fScore + 1;
        for(let offset of [{row: 1, col: 0}, {row: -1, col: 0}, {row: 0, col: 1}, {row: 0, col: -1}]){
            let neighbor = {row: n.row + offset.row, col: n.col + offset.col};
            if(neighbor.row < 0 || neighbor.col < 0 || neighbor.row >= gridSize || neighbor.col >= gridSize){
                continue;
            }
            
            let neighborString = nodeToString(neighbor);
            //console.log("examining neighbor: " + neighborString);
            
            if(!nodeData.has(neighborString)){
                nodeData.set(neighborString, {fScore: thisFScore, cameFrom: n});
                frontier.add(neighborString);
            } else if(nodeData.get(neighborString).fScore > thisFScore){
                console.log("found better path to neighbor " + neighborString);
                nodeData.set(neighborString, {fScore: thisFScore, cameFrom: n});
                frontier.decreaseKey(neighborString);
            }
        }
    }
}

/*        
var pq = new PQueue((x) => { return -x;});
for(let i = 5; i >= 0; i--){
    pq.add(i);
    pq.print();
}
console.log(pq);
*/

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let delay = 100;
async function animateSearch(result){
    
    for(let cell of result.log){
        if(!animate){ return; }
        if(cell.row == start.row && cell.col == start.col){ continue; }
        ctx.fillStyle = '#333388';
        ctx.fillRect(cell.col*cellWidth, cell.row*cellHeight, cellWidth, cellHeight);
        await sleep(delay);
    }
    await sleep(1000);
    for(let cell of result.path){
        if(!animate){ return; }
        ctx.fillStyle = 'blue';
        ctx.fillRect(cell.col*cellWidth, cell.row*cellHeight, cellWidth, cellHeight);
        await sleep(delay);
    }
}
