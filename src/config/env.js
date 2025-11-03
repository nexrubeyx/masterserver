/**
 * Carregamento de Variáveis de Ambiente - Configurações do Sistema
 * 
 * Este módulo carrega e valida todas as configurações do servidor a partir do arquivo .env.
 * Ele garante que todas as variáveis obrigatórias estejam presentes e converte valores
 * para os tipos apropriados (números, booleanos, etc).
 * 
 * Principais grupos de configuração:
 * - Servidor: host, portas, limites
 * - Banco de dados: URI e nome do MongoDB
 * - Mapa: dimensões da viewport, mapas padrão
 * - Jogador: aparência padrão, velocidade
 * - TLS: certificados SSL e redirecionamento HTTPS
 * - Performance: taxa de atualização, intervalos de tick
 */

import dotenv from 'dotenv';

/**
 * Carrega e valida todas as variáveis de ambiente
 * 
 * @returns {Object} Objeto com todas as configurações tipadas e validadas
 * @throws {Error} Se alguma variável obrigatória estiver ausente
 * 
 * Variáveis obrigatórias:
 * - MONGODB_URI: String de conexão do MongoDB
 * - MONGODB_DB: Nome do banco de dados
 * - SERVER_HOST: Host/IP do servidor (ex: 0.0.0.0)
 * - SERVER_PORT_WS: Porta do WebSocket
 */
export function loadEnv() {
  // Carrega variáveis do arquivo .env para process.env
  dotenv.config();

  // Lista de variáveis obrigatórias - o servidor não inicia sem elas
  const required = ['MONGODB_URI', 'MONGODB_DB', 'SERVER_HOST', 'SERVER_PORT_WS'];
  for (const k of required) {
    if (!process.env[k]) {
      throw new Error(`Variável de ambiente ausente: ${k}`);
    }
  }

  // Objeto com todas as configurações processadas e tipadas
  const env = {
    // === CONFIGURAÇÕES GERAIS ===
    NODE_ENV: process.env.NODE_ENV || 'development',
    SERVER_NAME: process.env.SERVER_NAME || 'ML Compatible Server',
    SERVER_HOST: process.env.SERVER_HOST,
    SERVER_PORT_WS: parseInt(process.env.SERVER_PORT_WS, 10),
    
    // === MONGODB ===
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB: process.env.MONGODB_DB,
    
    // === LIMITES DE REDE ===
    // Tamanho máximo do payload em bytes (64KB padrão)
    MAX_PAYLOAD_BYTES: parseInt(process.env.MAX_PAYLOAD_BYTES || '65536', 10),
    // Janela de tempo para rate limiting (10 segundos)
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '10000', 10),
    // Máximo de mensagens permitidas na janela de rate limiting
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),

    // === CONFIGURAÇÕES DE MAPA ===
    // ID do mapa onde novos jogadores aparecem
    DEFAULT_MAP_ID: process.env.DEFAULT_MAP_ID || 'overworld',
    // Posição X inicial para novos jogadores
    DEFAULT_X: parseInt(process.env.DEFAULT_X || '10', 10),
    // Posição Y inicial para novos jogadores
    DEFAULT_Y: parseInt(process.env.DEFAULT_Y || '10', 10),
    // Raio da viewport em tiles (horizontal)
    MAP_VIEW_RADIUS_X: parseInt(process.env.MAP_VIEW_RADIUS_X || '18', 10),
    // Raio da viewport em tiles (vertical)
    MAP_VIEW_RADIUS_Y: parseInt(process.env.MAP_VIEW_RADIUS_Y || '13', 10),
    // Música padrão que toca ao entrar
    DEFAULT_SONG: process.env.DEFAULT_SONG || 'rpgtitle',

    // === APARÊNCIA PADRÃO DO JOGADOR ===
    // Sprite do corpo (1 = humano básico)
    DEFAULT_BODY: parseInt(process.env.DEFAULT_BODY || '1', 10),
    // Estilo do cabelo
    DEFAULT_HAIR: parseInt(process.env.DEFAULT_HAIR || '1', 10),
    // Estilo da roupa
    DEFAULT_CLOTHES: parseInt(process.env.DEFAULT_CLOTHES || '1', 10),
    // Cor do cabelo em decimal RGB (6504471 = #634347)
    DEFAULT_HAIR_COLOR: parseInt(process.env.DEFAULT_HAIR_COLOR || '6504471', 10),
    // Cor da roupa em decimal RGB (14540253 = #DDD5DD)
    DEFAULT_CLOTHES_COLOR: parseInt(process.env.DEFAULT_CLOTHES_COLOR || '14540253', 10),
    // Cor dos olhos em decimal RGB (255 = #0000FF)
    DEFAULT_EYE_COLOR: parseInt(process.env.DEFAULT_EYE_COLOR || '255', 10),
    // Cor do nome do jogador em decimal RGB (15724527 = #EFF2EF)
    DEFAULT_NAME_COLOR: parseInt(process.env.DEFAULT_NAME_COLOR || '15724527', 10),
    // Nível inicial do jogador
    DEFAULT_LEVEL: parseInt(process.env.DEFAULT_LEVEL || '1', 10),
    // Tile de parede padrão para áreas fora do mapa
    DEFAULT_CAVE_WALL: parseInt(process.env.DEFAULT_CAVE_WALL || '112', 10),
    // Tile de chão padrão para áreas fora do mapa
    DEFAULT_CAVE_FLOOR: parseInt(process.env.DEFAULT_CAVE_FLOOR || '19', 10),

    // === CLIENTE ===
    // Versão esperada do cliente (para compatibilidade)
    CLIENT_VERSION: process.env.CLIENT_VERSION || '5.1.2',

    // === MOVIMENTO ===
    // Velocidade padrão do jogador em milissegundos por tile
    // 750ms = aproximadamente 1.3 tiles por segundo
    DEFAULT_SPEED_MS: parseInt(process.env.DEFAULT_SPEED_MS || '750', 10),

    // === TLS/SSL (HTTPS/WSS) ===
    // Se true, habilita servidor HTTPS/WSS com certificados SSL
    TLS_ENABLE: String(process.env.TLS_ENABLE || 'false').toLowerCase() === 'true',
    // Caminho para o arquivo do certificado SSL
    TLS_CERT_PATH: process.env.TLS_CERT_PATH || '',
    // Caminho para o arquivo da chave privada SSL
    TLS_KEY_PATH: process.env.TLS_KEY_PATH || '',
    // Porta para HTTPS/WSS (443 é padrão)
    TLS_PORT: parseInt(process.env.TLS_PORT || '443', 10),
    // Se true, cria servidor HTTP que redireciona para HTTPS
    HTTP_REDIRECT_ENABLE: String(process.env.HTTP_REDIRECT_ENABLE || 'false').toLowerCase() === 'true',
    // Porta para o servidor de redirecionamento HTTP (80 é padrão)
    HTTP_REDIRECT_PORT: parseInt(process.env.HTTP_REDIRECT_PORT || '80', 10),

    // === PERFORMANCE E LOOP DO JOGO ===
    // Intervalo do tick do game loop em milissegundos (50ms = 20 ticks/segundo)
    TICK_MS: parseInt(process.env.TICK_MS || '50', 10),
    // Taxa máxima de envio de snapshots de jogadores (20 Hz = 20 atualizações/segundo)
    SNAPSHOT_MAX_HZ: parseInt(process.env.SNAPSHOT_MAX_HZ || '20', 10),
    // Taxa máxima de envio de atualizações de mapa (20 Hz)
    MAP_MAX_HZ: parseInt(process.env.MAP_MAX_HZ || '20', 10),

    // === DESCONEXÃO E SLEEP ===
    // Tempo em milissegundos que um jogador fica em modo "sleep" antes de ser removido
    // após desconectar (60000ms = 1 minuto)
    SLEEP_TIMEOUT_MS: parseInt(process.env.SLEEP_TIMEOUT_MS || '60000', 10),

    // === SEGURANÇA - VALIDAÇÃO DE MOVIMENTO ===
    // Máximo de violações de segurança antes de marcar jogador como suspeito
    SECURITY_MAX_VIOLATIONS: parseInt(process.env.SECURITY_MAX_VIOLATIONS || '5', 10),
    // Tamanho do histórico de posições mantido para cada jogador
    SECURITY_HISTORY_SIZE: parseInt(process.env.SECURITY_HISTORY_SIZE || '10', 10),
    // Distância máxima em tiles que um jogador pode se mover de uma vez (1 = sem teleporte)
    SECURITY_MAX_MOVE_DISTANCE: parseInt(process.env.SECURITY_MAX_MOVE_DISTANCE || '1', 10),
    // Intervalo mínimo em ms entre movimentos válidos (anti-speedhack)
    SECURITY_MIN_MOVE_INTERVAL: parseInt(process.env.SECURITY_MIN_MOVE_INTERVAL || '20', 10),
    // Tolerância em tiles para coordenadas cliente vs servidor (compensar lag)
    SECURITY_COORD_TOLERANCE: parseInt(process.env.SECURITY_COORD_TOLERANCE || '2', 10),
    // Threshold de chunk - quantos tiles o jogador pode se mover antes de reenviar viewport
    SECURITY_CHUNK_THRESHOLD: parseInt(process.env.SECURITY_CHUNK_THRESHOLD || '4', 10),
    // ID máximo de tile considerado válido
    SECURITY_MAX_TILE_ID: parseInt(process.env.SECURITY_MAX_TILE_ID || '10000', 10),
    // Tamanho do cache de checksums de chunks por jogador
    SECURITY_CHUNK_CACHE_SIZE: parseInt(process.env.SECURITY_CHUNK_CACHE_SIZE || '20', 10)
  };

  return env;
}