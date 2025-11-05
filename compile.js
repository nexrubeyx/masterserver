import fs from 'fs';

// Caminho do arquivo JSON
const jsonPath = './src/maps/worlds/map.json';

// Função para ler e exibir dados do JSON
function lerDadosJson(caminho) {
    fs.readFile(caminho, 'utf8', (err, data) => {
        if (err) {
            console.error('Erro ao ler o arquivo:', err);
            return;
        }
        try {
            const jsonData = JSON.parse(data);
            console.log('Dados do JSON:', jsonData);
        } catch (parseErr) {
            console.error('Erro ao analisar o JSON:', parseErr);
        }
    });
}

// Função utilitária para normalizar valores (remove underscores)
function normalizarValor(valor) {
    return String(valor).replace(/_/g, '');
}

// Função para procurar e substituir valores nos layers (formato string "577:577:577")
function substituirValoresString(jsonData, valorAntigo, valorNovo) {
    const valorAntigoStr = normalizarValor(valorAntigo);
    // NÃO normalizar valorNovo, para manter o underscore
    const valorNovoStr = String(valorNovo);
    ['layer1', 'layer2', 'tiles'].forEach(layer => {
        if (typeof jsonData[layer] === 'string') {
            jsonData[layer] = jsonData[layer]
                .split(':')
                .map(item => item.trim() === valorAntigoStr ? valorNovoStr : item)
                .join(':');
        }
    });
    return jsonData;
}

// Função para ler, modificar e salvar dados do JSON (camada string)
function lerModificarSalvarJsonString(caminho, valorAntigo, valorNovo) {
    fs.readFile(caminho, 'utf8', (err, data) => {
        if (err) {
            console.error('Erro ao ler o arquivo:', err);
            return;
        }
        try {
            const jsonData = JSON.parse(data);
            console.log('Antes:', {
                layer1: jsonData.layer1,
                layer2: jsonData.layer2,
                tiles: jsonData.tiles
            });

            const novoJson = substituirValoresString(jsonData, valorAntigo, valorNovo);

            console.log('Depois:', {
                layer1: novoJson.layer1,
                layer2: novoJson.layer2,
                tiles: novoJson.tiles
            });

            fs.writeFile(caminho, JSON.stringify(novoJson, null, 2), err => {
                if (err) {
                    console.error('Erro ao salvar o arquivo:', err);
                } else {
                    console.log('Arquivo salvo com sucesso!');
                }
            });
        } catch (parseErr) {
            console.error('Erro ao analisar o JSON:', parseErr);
        }
    });
}

// Executa a leitura
lerDadosJson(jsonPath);

// Exemplo de uso: substituir valor 577 por "36_1" (com underscore)
// Para manter o underscore, passe o valor novo como string
lerModificarSalvarJsonString(jsonPath, 361, "36_1"
);
