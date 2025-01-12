//if(innerWidth<=425){
    var tela ={width: innerWidth, height: innerHeight - 8}
//}else{
    //var tela = {width: innerWidth - 500, height: innerHeight - 8}
//}
const canvas = document.querySelector("canvas");
canvas.width = tela.width;
canvas.height = tela.height;

const c = canvas.getContext('2d');




// ---------------------------------------ZOOM IN / PANNING--------------------------------------------------

var tamanhoUniverso = 3;

var universoWidth = canvas.width * tamanhoUniverso; 
var universoHeight = canvas.height * tamanhoUniverso; 


trackTransforms(c)


function redraw(){
    // Clear the entire canvas
    var p1 = c.transformedPoint(0,0);
    var p2 = c.transformedPoint(canvas.width,canvas.height);
    c.clearRect(p1.x,p1.y,p2.x-p1.x,p2.y-p1.y);

    c.save();
    if (!CanvasRenderingContext2D.prototype.resetTransform) {
        CanvasRenderingContext2D.prototype.resetTransform = function() {
            this.setTransform(1, 0, 0, 1, 0, 0);
        };
    }
    // c.setTransform(1,0,0,1,0,0);
    c.clearRect(0,0,universoWidth,universoHeight);
    c.restore();
}
// redraw();

var lastX=canvas.width/2, lastY=canvas.height/2;

var dragStart,dragged;

canvas.addEventListener('mousedown',function(evt){
    if(evt.button == 1){
        document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
        lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
        lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
        dragStart = c.transformedPoint(lastX,lastY);
        dragged = false;
    }
},false);


canvas.addEventListener('mousemove',function(evt){
    lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
    lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
    dragged = true;
    if (dragStart){
        var pt = c.transformedPoint(lastX,lastY);
        c.translate(pt.x-dragStart.x,pt.y-dragStart.y);
        redraw();
    }
    desenhaTudo();
},false);

canvas.addEventListener('mouseup',function(evt){
    dragStart = null;
},false);

var scaleFactor = 1.05;

var zoom = function(clicks){
    var pt = c.transformedPoint(lastX,lastY);
    c.translate(pt.x,pt.y);
    var factor = Math.pow(scaleFactor,clicks);
    c.scale(factor,factor);
    c.translate(-pt.x,-pt.y);
    redraw();
    desenhaTudo();
}


var handleScroll = function(evt){
    var delta = evt.wheelDelta ? evt.wheelDelta/40 : evt.detail ? -evt.detail : 0;
    if (delta){
        zoom(delta);
    }
    return evt.preventDefault() && false;
};

canvas.addEventListener('DOMMouseScroll',handleScroll,false);
canvas.addEventListener('mousewheel',handleScroll,false);


// Adds c.getTransform() - returns an SVGMatrix
// Adds c.transformedPoint(x,y) - returns an SVGPoint
function trackTransforms(c){
    var svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
    var xform = svg.createSVGMatrix();
    c.getTransform = function(){ return xform; };

    var savedTransforms = [];
    var save = c.save;
    c.save = function(){
        savedTransforms.push(xform.translate(0,0));
        return save.call(c);
    };

    var restore = c.restore;
    c.restore = function(){
        xform = savedTransforms.pop();
        return restore.call(c);
    };

    var scale = c.scale;
    c.scale = function(sx,sy){
        xform = xform.scaleNonUniform(sx,sy);
        return scale.call(c,sx,sy);
    };

    var rotate = c.rotate;
    c.rotate = function(radians){
        xform = xform.rotate(radians*180/Math.PI);
        return rotate.call(c,radians);
    };

    var translate = c.translate;
    c.translate = function(dx,dy){
        xform = xform.translate(dx,dy);
        return translate.call(c,dx,dy);
    };

    var transform = c.transform;
    c.transform = function(a,b,c,d,e,f){
        var m2 = svg.createSVGMatrix();
        m2.a=a; m2.b=b; m2.c=c; m2.d=d; m2.e=e; m2.f=f;
        xform = xform.multiply(m2);
        return transform.call(c,a,b,c,d,e,f);
    };

    var setTransform = c.setTransform;
    c.setTransform = function(a,b,c,d,e,f){
        xform.a = a;
        xform.b = b;
        xform.c = c;
        xform.d = d;
        xform.e = e;
        xform.f = f;
        return setTransform.call(c,a,b,c,d,e,f);
    };

    var pt  = svg.createSVGPoint();
    c.transformedPoint = function(x,y){
        pt.x=x; pt.y=y;
        return pt.matrixTransform(xform.inverse());
    }
}



// ------------------------------------------------------------------------------------------------------------------




// % of energy needed to reproduce
// carnivore 
var fome_c = 0.5; // porcentagem da energia máxima acima da qual eles não comerão
// herbivore
var fome_h = 0.999; // porcentagem da energia máxima acima da qual eles não comerão

var mudarGrafico = false;

// Variáveis para o gráfico (herbívoro)
var popH;
var velMedH;
var forcaMedH;
var raioMedH;
var raioDetMedH;
var energMedH;
var taxaEnergMedH;

// Variáveis para o gráfico (carnívoro)
var popC;
var velMedC;
var forcaMedC;
var raioMedC;
var raioDetMedC;
var energMedC;
var taxaEnergMedC;

// Variáveis para alterações nas mutações
// var probabilidade_mutacao = labelProb; // chances de cada gene (atributo) sofrer mutação
var magnitude_mutacao = 0.1; // magnitude da mutação (o quanto vai variar)

var lado_direito_vazio = true;
var lado_esquerdo_vazio = true;

// QuadTree
let retanguloCanvas = new Retangulo(universoWidth/2, universoHeight/2, universoWidth/2, universoHeight/2);

var popover_id = 1;

// Configuracoes dos organismos editados
var conf_c;
var conf_h;



// ---------------------------------------------------------------------------------------
//                                  FUNÇÕES
// ---------------------------------------------------------------------------------------

function criaUniverso(tamanhoUniverso){
    universoWidth = canvas.width * tamanhoUniverso; 
    universoHeight = canvas.height * tamanhoUniverso;
}

function verificaViesMutacoes(valor, iteracoes){
    var menor = 0;
    var maior = 0;
    var igual = 0;
    var novoValor = 0;
    for(var i = 0; i < iteracoes; i++){
        novoValor = newMutacao(valor)
        if(novoValor > valor){
            maior++;
        } else if(novoValor < valor){
            menor++;
        } else{
            igual++;
        }
    }

    console.log("Maior: " + ((maior * 100)/iteracoes) + "%")
    console.log("Menor: " + ((menor * 100)/iteracoes) + "%")
    console.log("Igual: " + ((igual * 100)/iteracoes) + "%")
    console.log("Mutações: " + (((maior + menor) * 100)/iteracoes) + "%")
}

function verificaViesMutacoesNinhada(ninhada_min, ninhada_max, iteracoes){
    var menor = 0;
    var maior = 0;
    var igual = 0;
    var ninhada_media = (ninhada_min + ninhada_max) / 2;
    for(var i = 0; i < iteracoes; i++){
        novoIntervalo = mutacaoNinhada(ninhada_min, ninhada_max)
        nova_ninhada_media = (novoIntervalo[0] + novoIntervalo[1]) / 2
        if(nova_ninhada_media > ninhada_media){
            maior++;
        } else if(nova_ninhada_media < ninhada_media){
            menor++;
        } else{
            igual++;
        }
    }

    console.log("Maior: " + ((maior * 100)/iteracoes) + "%")
    console.log("Menor: " + ((menor * 100)/iteracoes) + "%")
    console.log("Igual: " + ((igual * 100)/iteracoes) + "%")
    console.log("Mutações: " + (((maior + menor) * 100)/iteracoes) + "%")
}

// Função para não haver a necessidade de dar despausa() e pausa() quando é preciso redesenhar os elementos sem dar play em animate()
function desenhaTudo(){
    Alimento.alimentos.forEach(a => {
        a.display();
    })
    Organismo.organismos.forEach(o => {
        o.display();
    })
}

function exportToCsv(filename, rows) {
    var processRow = function (row) {
        var finalVal = '';
        for (var j = 0; j < row.length; j++) {
            var innerValue = row[j] === null ? '' : row[j].toString();
            if (row[j] instanceof Date) {
                innerValue = row[j].toLocaleString();
            };
            var result = innerValue.replace(/""/g, '""""');
            result = result.replace(".", ",")
            if (result.search(/("|,|\n)/g) >= 0)
                result = '"' + result + '"';
            if (j > 0)
                finalVal += ';';
            finalVal += result;
        }
        return finalVal + '\n';
    };

    var csvFile = '';
    for (var i = 0; i < rows.length; i++) {
        csvFile += processRow(rows[i]);
    }

    var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        var link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}


function criaObjetos(n_carnivoros, n_herbivoros, n_alimentos){
    for(var i = 0; i < n_carnivoros; i++){
        var x =(Math.random() * (universoWidth - 50) + 25);
        var y = (Math.random() * (universoHeight - 50) + 25);
        geraCarnivoro(x,y);
    }
    for(var i = 0; i < n_herbivoros; i++){
        var x =(Math.random() * (universoWidth - 50) + 25);
        var y = (Math.random() * (universoHeight - 50) + 25);
        geraHerbivoro(x,y);    
    }
    for(var i = 0; i < n_alimentos; i++){
        var x =(Math.random() * (universoWidth - 50) + 25);
        var y = (Math.random() * (universoHeight - 50) + 25);
        geraAlimento(x,y);
    }
}

function destroiObjetos(){
    Carnivoro.carnivoros.length = 0;
    Herbivoro.herbivoros.length = 0;
    Alimento.alimentos.length = 0;
    // mudaIntervaloAlimentos(1001);
}


// cria mais alimentos ao longo do tempo
// a função setInterval() permite que ele chame o loop a cada x milisegundos
var intervaloTaxaAlimentos;

// variáveis de auxílio para a implementação da divisão de tela
var checkbox_divisao = document.getElementById('divisao');
var telaDividida;
var limitador_de_loop = 0;

function geraAlimento(x,y){
    var raio = geraNumeroPorIntervalo(1, 3);
    return new Alimento(x, y, raio);
}

function geraCarnivoro(x,y){ // função para poder adicionar mais carnívoros manualmente 
    var raio_inicial = geraNumeroPorIntervalo(2, 6);
    var vel_max = geraNumeroPorIntervalo(3, 6); 
    var forca_max = geraNumeroPorIntervalo(0.01, 0.05);
    var cor = geraCor();
    var raio_deteccao_inicial = geraNumeroPorIntervalo(80, 320);
    var ninhada_min = geraInteiro(1, 1);
    var ninhada_max = ninhada_min + geraInteiro(2, 4);
    var intervalo_ninhada = [ninhada_min, ninhada_max];
    var sexo;

    if(Math.random() < 0.5){
        sexo = 'XX'
    } else{
        sexo = 'XY'
    }

    if(conf_c) {
        raio_inicial = conf_c.raio_inicial;
        vel_max = conf_c.vel_max;
        forca_max = conf_c.forca_max;
        cor = conf_c.cor;
        intervalo_ninhada = conf_c.intervalo_ninhada
        sexo = conf_c.sexo
    }

    var dna = new DNA(
        raio_inicial,
        vel_max,
        forca_max,
        cor,
        raio_deteccao_inicial,
        intervalo_ninhada,
        sexo
    )

    return new Carnivoro(
        x, y, dna
    );
}


function geraHerbivoro(x,y){ // função para poder adicionar mais herbivoros manualmente    
    // Initial size
    var raio_inicial = geraNumeroPorIntervalo(2, 6);//3,8
    // Initial speed
    var vel_max = geraNumeroPorIntervalo(0, 0.001); //1,2.2
    //Initial agility
    var forca_max = geraNumeroPorIntervalo(1.5, 1.9);//0.01,0.05
    // color
    var cor = geraCor();
    // detection size
    var raio_deteccao_inicial = geraNumeroPorIntervalo(10, 40);//40,120
    //min offspring
    var ninhada_min = geraInteiro(3, 3);//1,1
    // max offspring
    var ninhada_max = ninhada_min + geraInteiro(6, 12);//1,8
    // litter interval
    var intervalo_ninhada = [ninhada_min, ninhada_max];
    //gender
    var sexo;

    if(Math.random() < 0.5){
        sexo = 'XX'
    } else{
        sexo = 'XY'
    }

    if(conf_h) {
        raio_inicial = conf_h.raio_inicial;
        vel_max = conf_h.vel_max;
        forca_max = conf_h.forca_max;
        cor = conf_h.cor;
        intervalo_ninhada = conf_h.intervalo_ninhada;
        sexo = conf_h.sexo;
    }

    var dna = new DNA(
        raio_inicial,
        vel_max,
        forca_max,
        cor,
        raio_deteccao_inicial,
        intervalo_ninhada,
        sexo
    )

    return new Herbivoro(
        x, y, dna
    );
}


function geraCor(){
    // variáveis para a geração de cores
    var r = Math.floor(Math.random() * 256); 
    var g = Math.floor(Math.random() * 256);
    var b = Math.floor(Math.random() * 256);
    var cor = "rgb(" + r + "," + g + "," + b + ")";

    return cor;
}

function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        "rgb("
        + parseInt(result[1], 16) + ","
        + parseInt(result[2], 16) + ","
        + parseInt(result[3], 16)
        + ")"
    : null;
}

function rgbToHex(rgb) {
    let result = /^rgb\(([\d]{1,3}),([\d]{1,3}),([\d]{1,3})\)$/i.exec(rgb)
    if(!result) return null;

    let r = parseInt(result[1]).toString(16)
    let g = parseInt(result[2]).toString(16)
    let b = parseInt(result[3]).toString(16)
    
    return `#${r.length<2? "0"+r:r}${g.length<2? "0"+g:g}${b.length<2? "0"+b:b}`
}

function corMutacao(estilo) {
    if(Math.random() < probabilidade_mutacao){ // Quanto menor for probabilidade_mutacao, menor será a chance da mutação ocorrer
        let cores = estilo.substring(4, estilo.length - 1) // remover os caracteres de texto. ex: "rgb(256,20,40)"
            .split(',') // retornar um array com os elementos separados por virgula. ex: 256,20,40
            .map(function(cor) { //pegar cada elemento do array e fazer os cálculos a seguir
                cor = parseInt(cor);
                let operacao = "";
                let p = Math.random();

                if(cor <= 10) { //para não gerar números negativos
                    operacao = "adicao"
                } else if(cor >= 246) { //para não gerar valores maiores que 256
                    operacao = "subtracao"

                } else { //randomiza se vai ser add ou subtraido valores caso a cor estiver entre 10 e 246
                    if(Math.random() < 0.5) {
                        operacao = "adicao"
                    } else {
                        operacao = "subtracao"
                    }
                }

                if(operacao == "adicao") {
                    if(p < 0.002){ // Há 0.2% de chance de a mutação ser grande
                        return Math.ceil(cor + cor * (Math.random() * magnitude_mutacao * 10));
                    } else if(p < 0.008){ // Há 0.6% de chance (0.8% - o 0.2% do if anterior) de a mutação ser razoavelmente grande
                        return Math.ceil(cor + cor * (Math.random() * magnitude_mutacao * 4));
                    } else if(p < 0.028){ // Há 2% de chance (2.8% - o 0.8% do if anterior) de a mutação ser razoável
                        return Math.ceil(cor + cor * (Math.random() * magnitude_mutacao * 2));
                    } else{
                        // return cor + Math.ceil(Math.random() * 10)
                        return Math.ceil(cor + cor * (Math.random() * magnitude_mutacao));
                    }
                    
                } else { //subtração
                    if(p < 0.002){ // Há 0.2% de chance de a mutação ser grande
                        return Math.ceil(cor - cor * (Math.random() * magnitude_mutacao * 10));
                    } else if(p < 0.008){ // Há 0.6% de chance (0.8% - o 0.2% do if anterior) de a mutação ser razoavelmente grande
                        return Math.ceil(cor - cor * (Math.random() * magnitude_mutacao * 4));
                    } else if(p < 0.028){ // Há 2% de chance (2.8% - o 0.8% do if anterior) de a mutação ser razoável
                        return Math.ceil(cor - cor * (Math.random() * magnitude_mutacao * 2));
                    } else{
                        return Math.ceil(cor - cor * (Math.random() * magnitude_mutacao));
                    }
                }
            });
        
        // console.log("MUTAÇÃO DE COR");
        return `rgb(${cores[0]},${cores[1]},${cores[2]})`
    } else{
        return estilo;
    }
}

function newMutacao(valor) {// exemplo: valor = 20;  magnitude_mutacao = 0.05 || 5%
    if(Math.random() < probabilidade_mutacao){ // Quanto menor for probabilidade_mutacao, menor será a chance da mutação ocorrer
        let p = Math.random();
        let variacao = valor * magnitude_mutacao; //  variacao = 20 * 0.05 = 1, ou seja, poderá variar de +1 a -1 no resultado
        if(p < 0.001){ // Há 0.1% de chance de a mutação ser bem grande
            variacao *= 10;
        } else if(p < 0.003){ // Há 0.2% de chance (0.3% - 0.1% do if anterior) de a mutação ser grande
            variacao *= 6;
        } else if(p < 0.008){ /// Há 0.5% de chance (0.8% - o 0.3% do if anterior) de a mutação ser razoavelmente grande
            variacao *= 3.5;
        } else if(p < 0.028){ // Há 2% de chance (2.8% - o 0.8% do if anterior) de a mutação ser razoável
            variacao *= 2;
        }
        
        let minimo = valor - variacao;  //  minimo = 20 - 1 = 19. Para que não precise sub-dividir o return em adição ou subtração
        variacao *= 2                   //  puxo o ponto de referência para o menor valor possível. Logo, o resultado variará de
                                        //  0 a +2, afinal a distância de 1 até -1 é 2.
        if(minimo <= 0) {
            minimo = valor * 0.01; // Se a mutação diminuir o valor para menos que 0, ela será simplesmente muito pequena
        }
        // console.log("MUTAÇÃO");
        return minimo + Math.random() * variacao; // 19 + Math.randon() * 2. O resultado estará entre o intervalo [19, 21]
    } else{ // Caso não ocorra mutação, retorna o valor original
        return valor;
    }
}

function mutacaoNinhada(ninhada_min, ninhada_max) {
    if(Math.random() < probabilidade_mutacao){ // Quanto menor for probabilidade_mutacao, menor será a chance da mutação ocorrer
        let variacao_ninhada_min = geraInteiro(0, 2 + Math.floor(magnitude_mutacao * 10));
        let variacao_ninhada_max = geraInteiro(0, 2 + Math.floor(magnitude_mutacao * 10));
 
        if(Math.random() >= 0.5) { // Soma
            ninhada_min += variacao_ninhada_min;
            ninhada_max += variacao_ninhada_max;
        } else{ // Subtrai
            ninhada_min -= variacao_ninhada_min;
            ninhada_max -= variacao_ninhada_max;
        }

        if(ninhada_min <= 0) {
            ninhada_min = 0;
        }
        if(ninhada_max <= ninhada_min) {
            ninhada_max = ninhada_min + 1;
        }
    }
    
    return [ninhada_min, ninhada_max];
}



function geraNumeroPorIntervalo(min, max) {
    let delta = max - min; // exemplo: 4000 e 6000. 6000 - 4000 = 2000
    return parseFloat((Math.random() * delta + min).toFixed(4)); // Math.random() * 2000 + 4000
}

function criaAlimentosGradativo(){
    if(!pausado){ // Para de criar alimentos enquanto a simulação estiver pausada
        if(telaDividida){
            if(lado_esquerdo_vazio){ // Se não houver população no lado esquerdo, não gerará alimentos lá
                var x = geraNumeroPorIntervalo(universoWidth/2 + 31, universoWidth - 31);
                var y = Math.random() * (universoHeight - 62) + 31;
                var raio = Math.random() * 1.5 + 1;
    
                if(Alimento.alimentos.length < 3000){ // Limitador para não sobrecarregar a simulação
                    new Alimento(x, y, raio);
                }
            }
            if(lado_direito_vazio){ // Se não houver população no lado direito, não gerará alimentos lá
                var x = geraNumeroPorIntervalo(31, universoWidth/2 - 31);
                var y = Math.random() * (universoHeight - 62) + 31;
                var raio = Math.random() * 1.5 + 1;
    
                if(Alimento.alimentos.length < 3000){ // Limitador para não sobrecarregar a simulação
                    new Alimento(x, y, raio);
                }
            }
            if(!lado_direito_vazio && !lado_esquerdo_vazio){
                var x = Math.random() * (universoWidth - 62) + 31;
                var y = Math.random() * (universoHeight - 62) + 31;
                var raio = Math.random() * 1.5 + 1;

                if(Alimento.alimentos.length < 3000){ // Limitador para não sobrecarregar a simulação
                    new Alimento(x, y, raio);
                }
            }
        } else{
            var x = Math.random() * (universoWidth - 62) + 31;
            var y = Math.random() * (universoHeight - 62) + 31;
            var raio = Math.random() * 1.5 + 1;

            if(Alimento.alimentos.length < 3000){ // Limitador para não sobrecarregar a simulação
                new Alimento(x, y, raio);
            }
        }
    }
}

function mudaIntervaloAlimentos(novoValor, criar=false) {
    novoTempo = 1000 / novoValor
    if(!criar) {
        clearInterval(intervaloTaxaAlimentos);
    }
    if(novoTempo > 1000) return;
    if(antesDoPlay) return;
    intervaloTaxaAlimentos = setInterval(criaAlimentosGradativo, novoTempo)
}

function mudaProbMutacao(novoValor){
    probabilidade_mutacao = novoValor / 100;
}

function mudaMagMutacao(novoValor){
    magnitude_mutacao = novoValor / 100;
}

function desenhaDivisao(){
    c.beginPath();
    c.moveTo(universoWidth / 2, 0);
    c.lineTo(universoWidth / 2, universoHeight);
    c.strokeStyle = "white";
    c.stroke();
}

function desenhaQuadTree(qtree){
    qtree.desenha();

    let alcance = new Retangulo(Math.random() * universoWidth, Math.random() * universoHeight, 170, 123);
    c.rect(alcance.x - alcance.w, alcance.y - alcance.h, alcance.w*2, alcance.h*2);
    c.strokeStyle = "green";
    c.lineWidth = 3;
    c.stroke();

    let pontos = qtree.procura(alcance);
    for(let p of pontos){
        c.beginPath();
        c.arc(p.x, p.y, 1, 0, 2 * Math.PI);
        c.strokeStyle = "red";
        c.stroke();
    }
}

function criaPontos(){
    let congregacao = new Ponto(Math.random() * universoWidth, Math.random() * universoHeight);
    
    for(var i = 0; i < 500; i++){
        let p = new Ponto(Math.random() * universoWidth, Math.random() * universoHeight);
        qtree.inserirPonto(p);
    }
    for(var i = 0; i < 300; i++){
        let p = new Ponto(congregacao.x + (Math.random() - 0.5) * 300, congregacao.y + (Math.random() - 0.5) * 300);
        qtree.inserirPonto(p);
    }
    for(var i = 0; i < 400; i++){
        let p = new Ponto(congregacao.x + (Math.random() - 0.5) * 600, congregacao.y + (Math.random() - 0.5) * 600);
        qtree.inserirPonto(p);
    }
    for(var i = 0; i < 400; i++){
        let p = new Ponto(congregacao.x + (Math.random() - 0.5) * 800, congregacao.y + (Math.random() - 0.5) * 800);
        qtree.inserirPonto(p);
    }
}

function calculaDadosGrafico(){
    // Liberar espaço de memória das variáveis anteriores
    popH = velMedH = forcaMedH = raioMedH = raioDetMedH = energMedH = taxaEnergMedH = ninhadaMediaH = null;
    popC = velMedC = forcaMedC = raioMedC = raioDetMedC = energMedC = taxaEnergMedC = ninhadaMediaC = null;

    // Resetando as variáveis para os herbívoros
    popH = {sem_div: 0, esq: 0, dir: 0}
    velMedH = {sem_div: 0, esq: 0, dir: 0};
    forcaMedH = {sem_div: 0, esq: 0, dir: 0};
    raioMedH = {sem_div: 0, esq: 0, dir: 0};
    raioDetMedH = {sem_div: 0, esq: 0, dir: 0};
    energMedH = {sem_div: 0, esq: 0, dir: 0};
    taxaEnergMedH = {sem_div: 0, esq: 0, dir: 0};
    ninhadaMediaH = {sem_div: 0, esq: 0, dir: 0};

    // Resetando as variáveis para os carnívoros
    popC = {sem_div: 0, esq: 0, dir: 0}
    velMedC = {sem_div: 0, esq: 0, dir: 0};
    forcaMedC = {sem_div: 0, esq: 0, dir: 0};
    raioMedC = {sem_div: 0, esq: 0, dir: 0};
    raioDetMedC = {sem_div: 0, esq: 0, dir: 0};
    energMedC = {sem_div: 0, esq: 0, dir: 0};
    taxaEnergMedC = {sem_div: 0, esq: 0, dir: 0};
    ninhadaMediaC = {sem_div: 0, esq: 0, dir: 0};


    Herbivoro.herbivoros.forEach(herbivoro => {
        // Soma o valor das variáveis pra todos os herbívoros
        popH["sem_div"]++
        velMedH["sem_div"] += herbivoro.vel_max;
        forcaMedH["sem_div"] += herbivoro.forca_max;
        raioMedH["sem_div"] += herbivoro.raio_inicial * 1.5; // o raio máximo é (1.5 * raio_inicial)
        raioDetMedH["sem_div"] += herbivoro.raio_deteccao_inicial * 1.3; // 1.3 e não 1.5 pois o raio de detecção aumenta menos que o raio
        energMedH["sem_div"] += herbivoro.energia_max_fixa;
        taxaEnergMedH["sem_div"] += herbivoro.taxa_gasto_energia_max;
        ninhadaMediaH["sem_div"] += (herbivoro.intervalo_ninhada[0] + herbivoro.intervalo_ninhada[1]) / 2;

        if(telaDividida){
            // Checa se está a direita ou a esquerda
            let lado;
            if(herbivoro.posicao.x < universoWidth / 2) {
                lado = "esq"
            } else {
                lado = "dir"
            }
            // Soma o valor das variáveis pra todos os herbívoros
            popH[lado]++
            velMedH[lado] += herbivoro.vel_max;
            forcaMedH[lado] += herbivoro.forca_max;
            raioMedH[lado] += herbivoro.raio_inicial * 1.5; // o raio máximo é (1.5 * raio_inicialimo)
            raioDetMedH[lado] += herbivoro.raio_deteccao_inicial * 1.3; // 1.3 e não 1.5 pois o raio de detecção aumenta menos que o raio
            energMedH[lado] += herbivoro.energia_max_fixa;
            taxaEnergMedH[lado] += herbivoro.taxa_gasto_energia_max;
            ninhadaMediaH[lado] += (herbivoro.intervalo_ninhada[0] + herbivoro.intervalo_ninhada[1]) / 2;
        }
    });

    Carnivoro.carnivoros.forEach(carnivoro => {
        // Soma o valor das variáveis pra todos os carnívoros
        popC["sem_div"]++
        velMedC["sem_div"] += carnivoro.vel_max;
        forcaMedC["sem_div"] += carnivoro.forca_max;
        raioMedC["sem_div"] += carnivoro.raio_inicial * 1.5; // o raio máximo é (1.5 * raio_inicial)
        raioDetMedC["sem_div"] += carnivoro.raio_deteccao_inicial * 1.3; // 1.3 e não 1.5 pois o raio de detecção aumenta menos que o raio
        energMedC["sem_div"] += carnivoro.energia_max_fixa;
        taxaEnergMedC["sem_div"] += carnivoro.taxa_gasto_energia_max;
        ninhadaMediaC["sem_div"] += (carnivoro.intervalo_ninhada[0] + carnivoro.intervalo_ninhada[1]) / 2;

        if(telaDividida){
            // Checa se está a direita ou a esquerda
            let lado;
            if(carnivoro.posicao.x < universoWidth / 2) {
                lado = "esq"
            } else {
                lado = "dir"
            }
            // Soma o valor das variáveis pra todos os carnívoros
            popC[lado]++
            velMedC[lado] += carnivoro.vel_max;
            forcaMedC[lado] += carnivoro.forca_max;
            raioMedC[lado] += carnivoro.raio_inicial * 1.5; // o raio máximo é (1.5 * raio_inicialimo)
            raioDetMedC[lado] += carnivoro.raio_deteccao_inicial * 1.3; // 1.3 e não 1.5 pois o raio de detecção aumenta menos que o raio
            energMedC[lado] += carnivoro.energia_max_fixa;
            taxaEnergMedC[lado] += carnivoro.taxa_gasto_energia_max;
            ninhadaMediaC[lado] += (carnivoro.intervalo_ninhada[0] + carnivoro.intervalo_ninhada[1]) / 2;
        }        
    });


    // Divide o valor (a soma total) pelo número de herbívoros para obter a média
    // Sem divisão
    velMedH.sem_div /= popH.sem_div;
    forcaMedH.sem_div /= popH.sem_div;
    raioMedH.sem_div /= popH.sem_div;
    raioDetMedH.sem_div /= popH.sem_div;
    energMedH.sem_div /= popH.sem_div;
    taxaEnergMedH.sem_div /= popH.sem_div;
    ninhadaMediaH.sem_div /= popH.sem_div;
    // Lado esquerdo
    velMedH.esq /= popH.esq;
    forcaMedH.esq /= popH.esq;
    raioMedH.esq /= popH.esq;
    raioDetMedH.esq /= popH.esq;
    energMedH.esq /= popH.esq;
    taxaEnergMedH.esq /= popH.esq;
    ninhadaMediaH.esq /= popH.esq;
    // Lado direito
    velMedH.dir /= popH.dir;
    forcaMedH.dir /= popH.dir;
    raioMedH.dir /= popH.dir;
    raioDetMedH.dir /= popH.dir;
    energMedH.dir /= popH.dir;
    taxaEnergMedH.dir /= popH.dir;
    ninhadaMediaH.dir /= popH.dir;

    // Divide o valor (a soma total) pelo número de carnívoros para obter a média
    // Sem divisão
    velMedC.sem_div /= popC.sem_div;
    forcaMedC.sem_div /= popC.sem_div;
    raioMedC.sem_div /= popC.sem_div;
    raioDetMedC.sem_div /= popC.sem_div;
    energMedC.sem_div /= popC.sem_div;
    taxaEnergMedC.sem_div /= popC.sem_div;
    ninhadaMediaC.sem_div /= popC.sem_div;
    // Lado esquerdo
    velMedC.esq /= popC.esq;
    forcaMedC.esq /= popC.esq;
    raioMedC.esq /= popC.esq;
    raioDetMedC.esq /= popC.esq;
    energMedC.esq /= popC.esq;
    taxaEnergMedC.esq /= popC.esq;
    ninhadaMediaC.esq /= popC.esq;
    // Lado direito
    velMedC.dir /= popC.dir;
    forcaMedC.dir /= popC.dir;
    raioMedC.dir /= popC.dir;
    raioDetMedC.dir /= popC.dir;
    energMedC.dir /= popC.dir;
    taxaEnergMedC.dir /= popC.dir;
    ninhadaMediaC.dir /= popC.dir;
}

function checaPopulacoesDivididas(){
    if(telaDividida){
        lado_direito_vazio = true;
        lado_esquerdo_vazio = true;
            
        Herbivoro.herbivoros.forEach(herbivoro => {
            // Checa lado esquerdo
            if(herbivoro.posicao.x < universoWidth / 2 - 31){
                lado_esquerdo_vazio = false;
            }

            // Checa lado direito
            if(herbivoro.posicao.x > universoWidth / 2 + 31){
                lado_direito_vazio = false;
            }
        })
    }
}

var idAnimate;

function pausa(){
    pausado = true;

    btnPausa.classList.add("d-none");
    btnDespausa.classList.remove("d-none");

}

function despausa(){
    pausado = false;

    btnDespausa.classList.add("d-none");
    btnPausa.classList.remove("d-none");

    animate();
}

function acelera(){
    animate();

    // btnDesacelera.classList.remove("d-none");
}

function desacelera(){
    pausa();
    setTimeout(despausa, 10);
}

function animate(){
    if(pausado == false){
        idAnimate = requestAnimationFrame(animate);
    }
    
    c.clearRect(0, 0, universoWidth, universoHeight);
    c.beginPath();
    c.moveTo(-3, -4);
    c.lineTo(universoWidth + 3, -3);
    c.lineTo(universoWidth + 3, universoHeight + 3);
    c.lineTo(-3, universoHeight + 3);
    c.lineTo(-3, -3);
    c.strokeStyle = "white";
    c.stroke();

    // Criando a Quadtree
    let qtree = new QuadTree(retanguloCanvas, 10);

    // Divisão de tela
    if(checkbox_divisao.checked){
        telaDividida = true;
    } else{
        telaDividida = false;
    }

    if(telaDividida){
        desenhaDivisao();

        Alimento.alimentos.forEach((alimento, i) => {
            alimento.display();
            // remove alimentos próximos da divisão para evitar que organismos se atraiam para perto dela
            if(alimento.posicao.x - universoWidth / 2 < 30 && alimento.posicao.x - universoWidth / 2 > -30){ 
                Alimento.alimentos.splice(i, 1);
            }

            qtree.inserirAlimento(alimento); // Insere o alimento na QuadTree

        })

        if(limitador_de_loop < 10){
            limitador_de_loop++;
        }
        
        Organismo.organismos.forEach((organismo) => {
            if(organismo.posicao.x <= universoWidth/2){ // se o organismo estiver na parte esquerda
                if(limitador_de_loop == 1 && universoWidth/2 - organismo.posicao.x < 10){ // empurra os organismos pertos da borda para o lado
                    organismo.posicao.x -= 10;
                }
                organismo.criaBordas(true); // telaDividida: true
            } else{ // se o organismo estiver na parte direita
                if(limitador_de_loop == 1 && organismo.posicao.x - universoWidth/2 < 10){ // empurra os organismos pertos da borda para o lado
                    organismo.posicao.x += 10;
                }
                organismo.criaBordas(true); // telaDividida: true
            }
        })

        // Inserindo os organismos na QuadTree antes de chamar os métodos de cada um
        Herbivoro.herbivoros.forEach(herbivoro => {
            qtree.inserirHerbivoro(herbivoro); // Insere o herbivoro na QuadTree
        });
        Carnivoro.carnivoros.forEach(carnivoro => {
            qtree.inserirCarnivoro(carnivoro); // Insere o carnivoro na QuadTree
        });

        // Chamando os métodos dos organismos
        Herbivoro.herbivoros.forEach(herbivoro => {
            herbivoro.update();
            herbivoro.vagueia();

            // Transforma o raio de detecção em um objeto círculo para podermos manipulá-lo
            let visaoH = new Circulo(herbivoro.posicao.x, herbivoro.posicao.y, herbivoro.raio_deteccao);
                
            // herbivoro.buscarAlimento(qtree, visaoH);
            if(herbivoro.energia <= herbivoro.energia_max * fome_h){ // FOME
                herbivoro.buscarAlimento(qtree, visaoH);
            }
            herbivoro.detectaPredador(qtree, visaoH);
        })

        Carnivoro.carnivoros.forEach(carnivoro => {
            carnivoro.update();
            carnivoro.vagueia();

            // Transforma o raio de detecção em um objeto círculo para podermos manipulá-lo
            let visaoC = new Circulo(carnivoro.posicao.x, carnivoro.posicao.y, carnivoro.raio_deteccao);

            // carnivoro.buscarHerbivoro(qtree, visaoC);
            if(carnivoro.energia <= carnivoro.energia_max * fome_c){ // FOME
                carnivoro.buscarHerbivoro(qtree, visaoC);
            }
        })
    } else{ // se a tela NÃO estiver dividida
        limitador_de_loop = 0;

        Alimento.alimentos.forEach(alimento => {
            alimento.display();
            qtree.inserirAlimento(alimento); // Insere o alimento na QuadTree

        })

        Organismo.organismos.forEach((organismo) => {
            organismo.criaBordas(false); // telaDividida: false
        })

        // Inserindo os organismos na QuadTree antes de chamar os métodos de cada um
        Herbivoro.herbivoros.forEach(herbivoro => {
            qtree.inserirHerbivoro(herbivoro); // Insere o herbivoro na QuadTree
        });
        Carnivoro.carnivoros.forEach(carnivoro => {
            qtree.inserirCarnivoro(carnivoro); // Insere o carnivoro na QuadTree
        });
        
        // Chamando os métodos dos organismos
        Herbivoro.herbivoros.forEach(herbivoro => {
            herbivoro.update();
            herbivoro.vagueia();
            
            // Transforma o raio de detecção em um objeto círculo para podermos manipulá-lo
            let visaoH = new Circulo(herbivoro.posicao.x, herbivoro.posicao.y, herbivoro.raio_deteccao);

            // herbivoro.buscarAlimento(qtree, visaoH);
            if(herbivoro.energia <= herbivoro.energia_max * fome_h){ // FOME
                herbivoro.buscarAlimento(qtree, visaoH);
            }
            
            herbivoro.detectaPredador(qtree, visaoH);
        })

        Carnivoro.carnivoros.forEach(carnivoro => {
            carnivoro.update();
            carnivoro.vagueia();

            // Transforma o raio de detecção em um objeto círculo para podermos manipulá-lo
            let visaoC = new Circulo(carnivoro.posicao.x, carnivoro.posicao.y, carnivoro.raio_deteccao);

            // carnivoro.buscarHerbivoro(qtree, visaoC);
            if(carnivoro.energia <= carnivoro.energia_max * fome_c){ // FOME
                carnivoro.buscarHerbivoro(qtree, visaoC);
            }
        })
    }
}

function geraInteiro(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }
// ----------------------------------------------------------------------------------------------
//                                   Paineis dinamicos e Popovers
// ----------------------------------------------------------------------------------------------
// Função atrelada ao evento click para encontrar o organismo na lista e retornar suas propriedades
function getOrganismo(x, y) {
    let organismo = Organismo.organismos.find(o => Math.abs(o.posicao.x - x) <= 10 && Math.abs(o.posicao.y - y) <= 10)
    if(organismo == undefined) {
        return; //console.log("não encontrou")
    }

    // Verificar se ja existe um popover referente ao organismo clicado
    let popoverJaExiste = document.querySelectorAll(`.popover-info[data-organismoid="${organismo.id}"]`).length > 0 ? 1:0
    if (popoverJaExiste) {
        return;
    }
    
    let popover = `
        <div id="popover-${popover_id}" class="popover-info" data-organismoid="${organismo.id}" style="top:${parseInt(organismo.posicao.y - 20)}px; left:${parseInt(organismo.posicao.x + 15)}px">
            <div class="popover-title">
                ${(organismo instanceof Carnivoro) ? "Carnívoro":"Herbívoro"} <div style="color: grey; display: inline; font-size: medium">#${organismo.id}</div>
            </div>
            <div class="popover-content">
                <b>Sexo:</b> <div id="pop-sexo-${popover_id}" style="display: inline">${organismo.sexo}</div><br/>
                <b>Raio:</b> <div id="pop-raio-${popover_id}" style="display: inline">${organismo.raio.toFixed(2)}</div>/${(organismo.raio_inicial * 1.5).toFixed(2)}<br/>
                <b>Velocidade:</b> <div id="pop-vel-${popover_id}" style="display: inline">${organismo.vel.mag().toFixed(2)}</div>/${organismo.vel_max.toFixed(2)}<br/>
                <b>Raio de detecção:</b> <div id="pop-deteccao-${popover_id}" style="display: inline">${organismo.raio_deteccao.toFixed(2)}</div><br/>
                <b>Energia:</b> <div id="pop-energia-${popover_id}" style="display: inline">${organismo.energia.toFixed(2)}</div>/<div id="pop-energia-max-${popover_id}" style="display: inline">${organismo.energia_max.toFixed(2)}</div><br/>
                <b>Gasto energético:</b> <div id="pop-gasto-${popover_id}" style="display: inline">${(organismo.taxa_gasto_energia + organismo.gasto_minimo).toFixed(3)}</div><br/>
                <b>Cor:</b> <svg width="20" height="20"><rect width="18" height="18" style="fill:${organismo.cor}"/></svg> ${organismo.cor}<br/>
                <!-- <b>Fome:</b> <div id="pop-fome-${popover_id}" style="display: inline">${organismo.energia <= organismo.energia_max * 0.8 ? "Com fome":"Satisfeito"}</div><br/> -->
                <b>Status:</b> <div id="pop-status-${popover_id}" style="display: inline">${organismo.status}</div><br/>
                <b>Idade:</b> <div id="pop-vida-${popover_id}" style="display: inline">${organismo.tempo_vivido}</div>/${organismo.tempo_vida}<br/>
                <b>Ninhada: </b> de <div id="pop-ninhada-min-${popover_id}" style="display: inline">${organismo.intervalo_ninhada[0]}</div> a <div id="pop-ninhada-max-${popover_id}" style="display: inline">${organismo.intervalo_ninhada[1]}</div><br/>
                <b>Filhos:</b> <div id="pop-vezes-reproduzidas-${popover_id}" style="display: inline">${organismo.filhos.length}</div><br/>
                <button type="button" class="btn btn-danger btn-sm" onclick="excluirOrganismoPopover(${popover_id}, ${organismo.id})" style="margin-top: 10px">Excluir ${(organismo instanceof Carnivoro) ? "Carnívoro":"Herbívoro"}</button>
            </div>
            <button type="button" class="btn close" aria-label="Close"
                onclick="deletePopover(${popover_id}, ${organismo.id})">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `
    $("body").append($(popover));

    let pop_id = popover_id
    // CRIAR MONITORADOR PARA A VARIÁVEL POSICAO
    organismo.proxy = new Proxy(organismo["posicao"], {
        set: function(target_org, key_position, value) {
            target_org[key_position] = value;

            //console.log("vetor mudou: "+key_position+" = "+value)

            let cssProperty = key_position == "x" ? 

                {left: parseInt((value + 15 - c.transformedPoint(0, 0).x))} : 
                {top: parseInt(value - 20 - c.transformedPoint(0, 0).y)}
            // Popover acompanhar a posicao do organismo
            $(`#popover-${pop_id}`).css(cssProperty);
            document.getElementById(`pop-raio-${pop_id}`).textContent = organismo.raio.toFixed(1);
            document.getElementById(`pop-vel-${pop_id}`).textContent = organismo.vel.mag().toFixed(2);
            document.getElementById(`pop-deteccao-${pop_id}`).textContent = organismo.raio_deteccao.toFixed(2);
            document.getElementById(`pop-energia-${pop_id}`).textContent = organismo.energia.toFixed(1);
            document.getElementById(`pop-energia-max-${pop_id}`).textContent = organismo.energia_max.toFixed(1);
            document.getElementById(`pop-gasto-${pop_id}`).textContent = (organismo.taxa_gasto_energia + organismo.gasto_minimo).toFixed(3);
            document.getElementById(`pop-status-${pop_id}`).textContent = organismo.status;
            document.getElementById(`pop-vezes-reproduzidas-${pop_id}`).textContent = organismo.vezes_reproduzidas;
            // organismo.energia <= organismo.energia_max * 0.8 ? document.getElementById(`pop-fome-${pop_id}`).textContent = "Com fome": document.getElementById(`pop-fome-${pop_id}`).textContent = "Satisfeito"
            document.getElementById(`pop-vida-${pop_id}`).textContent = organismo.tempo_vivido;
            return true;
        }
    })

    // SALVAR O ID DO POPOVER NO ORGANISMO
    organismo.popover_id = pop_id

    popover_id++
}

function deletePopover(popoverId, organismoId) {
    // Capturar organismo
    const organismo = Organismo.organismos.find(o => o.id == organismoId) || 0;
    if(organismo) {
        delete organismo.proxy
        delete organismo.popover_id
    }
    $(`#popover-${popoverId}`).remove()

    // Esconder botao de fechar todos os popovers se nao existem mais popover abertos
    if($(".popover-info").length == 0) {
        $("#btnDeletePopovers").hide();
    }
}

function excluirOrganismoPopover(popoverId, organismoId){
    // Capturar organismo
    const organismo = Organismo.organismos.find(o => o.id == organismoId) || 0;
    if(organismo) {
        organismo.morre();
        if(pausado){
            despausa(); // Se não fizer isso, o organismo continua aparecendo enquanto estiver pausado 
            pausa();
        }
    }
    $(`#popover-${popoverId}`).remove()
}

// GERAR PAINEL DE ESCOLHA DAS PROPRIEDADES DOS ORGANISMOS ADICIONADOS NA TELA
function showEditPanel(type) {
    // Restaurar configuracoes salvas
    let config;
    if(type == 1) {
        config = conf_c;
    } else {
        config = conf_h;
    }

    let panel = `
    
        <div class="row mb-3">
            <div id="edit-title" class="col-8">${type == 1? "Carnívoro":"Herbívoro"}</div>
            <!-- Se o aleatorio estiver ligado, desabilitar todos os inputs -->
            <button id="edit-random" class="btn col-2 btn-gray" onclick="randomConfig(${type})"><i class="fas fa-dice"></i></button>
            <button class="btn close col-2" onclick="$(this).closest('.edit-organism').addClass('d-none').html('')">
                <span class="text-white" aria-hidden="true">&times;</span>
            </button>
        </div>
    

        <form id="formConfig" class="container-fluid">
            <div class="row mb-3">
                <div style="display: inline; width: 50%">
                    <!-- desenho do organismo com atualizacao em tempo real -->
                    <b><label for="input-cor">Cor</label></b>
                    <input id="input-cor" name="cor" type="color" value="${config? rgbToHex(config.cor):"#ff0000"}">
                </div>
            </div>
            <div class="row p-0">
                <div style="display: inline; width: 50%">
                    <b><label for="input-raio">Raio</label></b>
                    <input id="input-raio" name="raio_inicial" type="number" value="${config? config.raio_inicial:(raio_inicial||geraNumeroPorIntervalo(3, 7).toFixed(2))}" class="form-control p-0">
                </div>  
                <div style="display: inline; width: 50%">                 
                    <b><label for="input-velocidade">Velocidade</label></b>
                    <input id="input-velocidade" name="vel_max" type="number" value="${config? config.vel_max.toFixed(2):geraNumeroPorIntervalo(1, 2.2).toFixed(2)}" class="form-control p-0">
                </div>
                <div style="display: inline; width: 50%">
                    <b><label for="input-forca">Agilidade</label></b>
                    <input id="input-forca" name="forca_max" type="number" value="${config? config.forca_max.toFixed(2):geraNumeroPorIntervalo(0.001, 0.05).toFixed(2)}" class="form-control p-0">
                </div>
                <div style="display: inline; width: 50%">
                    <b><label for="input-deteccao">Visão</label></b>
                    <input id="input-deteccao" name="raio_deteccao_inicial" type="number" value="${config? config.raio_deteccao_inicial.toFixed(2):geraNumeroPorIntervalo(15, 60).toFixed(2)}" class="form-control p-0">
                </div>
                <div style="display: inline; width: 50%">
                    <b><label for="input-ninhada">Tamanho da ninhada</label></b>
                    <input id="input-ninhada-min" name="intervalo_ninhada_min" type="number" value="${config? config.intervalo_ninhada[0]:geraNumeroPorIntervalo(1, 5)}" class="form-control p-0">
                    <input id="input-ninhada-max" name="intervalo_ninhada_max" type="number" value="${config? config.intervalo_ninhada[1]:geraNumeroPorIntervalo(1, 5)}" class="form-control p-0">
                    </div>
            </div>
        </form>
        <div class="row mt-2">
            <button type="button" onclick="serializarFormConfig(${type})" class="btn btn-sm btn-outline-secondary btn-block">Salvar</button>
        </div>
    
    
    `
    $("#painelEditar").html(panel).removeClass("d-none")
    // Iniciar como aleatorio se não existe configuracao previa salva
    if(!config) {
        randomConfig(type);
    }
}

function serializarFormConfig(type) {
    let obj = $("#formConfig").serializeArray().reduce(function(obj, value, i) {
        obj[value.name] = value.value;
        return obj;
    }, {});
    // Converter cor
    obj.cor = hexToRgb(obj["cor"])
    
    // Converter numeros
    obj.raio_inicial = parseFloat(obj.raio_inicial);
    obj.vel_max = parseFloat(obj.vel_max);
    obj.forca_max = parseFloat(obj.forca_max);
    obj.raio_deteccao_inicial = parseFloat(obj.raio_deteccao_inicial);
    obj.intervalo_ninhada = obj.intervalo_ninhada;

    if(type == 1) {
        conf_c = obj;
    } else {
        conf_h = obj;
    }
}

function randomConfig(type) {
    if($("#edit-random").hasClass("active")) {
        $("#edit-random").removeClass("active");

        // Retirar disable dos inputs
        $("#formConfig input").prop("disabled", false)
    } else {
        // apagar configuracao
        if(type==1 && conf_c) {
            // TODO: aviso para confirmar se quer aleatorizar mesmo.
            let resultado = confirm("Ao aleatorizar os valores, você perderá as configurações salvas para os Carnívoros. Deseja continuar?")
            if(resultado == true)
                conf_c = undefined;
            else
                return;
        } else if(type==2 && conf_h) {
            // TODO: aviso para confirmar se quer aleatorizar mesmo.
            let resultado = confirm("Ao aleatorizar os valores, você perderá as configurações salvas para os Herbívoros. Deseja continuar?")
            if(resultado == true)
                conf_h = undefined;
            else
                return;
        }
        $("#edit-random").addClass("active");
        // dar disable nos inputs de configuracao
        $("#formConfig input").prop("disabled", true)
    }
}

// ----------------------------------------------------------------------------------------------
//                                         Cronômetro
// ----------------------------------------------------------------------------------------------
var cronometro;

function criaCronometro(){
    cronometro = setInterval(() => { timer(); }, 10);
}

function timer() {
    if(!pausado){ // Só atualiza se a simulação não estiver pausada
        if ((milisegundo += 10) == 1000) {
        milisegundo = 0;
        segundo++;
        segundos_totais++;
        }
        if (segundo == 60) {
        segundo = 0;
        minuto++;
        }
        if (minuto == 60) {
        minuto = 0;
        hora++;
        }
        document.getElementById('hora').innerText = returnData(hora);
        document.getElementById('minuto').innerText = returnData(minuto);
        document.getElementById('segundo').innerText = returnData(segundo);
        document.getElementById('milisegundo').innerText = returnData(milisegundo);
    }
}
  
function returnData(input) {
    return input > 10 ? input : `0${input}`
}

function resetaCronometro(){
    hora = minuto = segundo = milisegundo = segundos_totais = 0;

    //limpar o cronometro se ele existe.
    try {
        clearInterval(cronometro);
    } catch(e){}

    document.getElementById('hora').innerText = "00";
    document.getElementById('minuto').innerText = "00";
    document.getElementById('segundo').innerText = "00";
    document.getElementById('milisegundo').innerText = "00";
}

function makeId(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * 
        charactersLength));
   }
   return result;
}

// ----------------------------------------------------------------------------------------------
//                                         Frame rate
// ----------------------------------------------------------------------------------------------

// // The higher this value, the less the fps will reflect temporary variations
// // A value of 1 will only keep the last value
// var filterStrength = 20;
// var frameTime = 0, lastLoop = new Date, thisLoop;

// function gameLoop(){
//   // ...
//   var thisFrameTime = (thisLoop=new Date) - lastLoop;
//   frameTime+= (thisFrameTime - frameTime) / filterStrength;
//   lastLoop = thisLoop;
// }

// // Report the fps only every second, to only lightly affect measurements
// var fpsOut = document.getElementById('framerate');
// setInterval(function(){
//   fpsOut.innerHTML = parseFloat((1000/frameTime).toFixed(1)) + " fps";
// },500);

// // function calculaFrameRate(){
// //     var fps;
// //     var thisLoop = new Date();
// //     fps = 1000/(thisLoop - lastLoop);
// //     lastLoop = thisLoop;

// //     return fps;
// //     document.getElementById("framerate").innerHTML = fps;
// // }

// setInterval(() => {
//     var thisLoop = new Date();
//     var fps = 1000/(thisLoop - lastLoop);
//     lastLoop = thisLoop;

//     document.getElementById("framerate").innerHTML = fps;
// }, 1000);
