# Chunk Loading Implementation

## Visão Geral

O sistema de **Chunk Loading** implementa carregamento inteligente de tiles quando o jogador se aproxima das bordas do mapa. Quando o jogador está longe das bordas, apenas o viewport normal é carregado. Quando o jogador se aproxima de uma borda, um chunk maior é carregado para proporcionar uma experiência mais suave.

## Problema Resolvido

**Antes**: Quando o jogador se aproximava das bordas do mapa, apenas os tiles visíveis no viewport (36x26 tiles) eram carregados. Isso poderia causar uma experiência de "pop-in" visível onde novos tiles apareciam abruptamente.

**Depois**: Quando o jogador está dentro de uma distância configurável da borda (padrão: 10 tiles), um chunk maior (48x36 tiles) é carregado automaticamente, garantindo transição suave e pré-carregamento de conteúdo.

## Configuração

As seguintes variáveis de ambiente controlam o comportamento do chunk loading:

### Viewport Normal (Longe das Bordas)
```env
MAP_VIEW_RADIUS_X=18  # Raio horizontal em tiles (total: 36 tiles de largura)
MAP_VIEW_RADIUS_Y=13  # Raio vertical em tiles (total: 26 tiles de altura)
```

### Chunk (Próximo às Bordas)
```env
MAP_CHUNK_RADIUS_X=24  # Raio horizontal do chunk (total: 48 tiles de largura)
MAP_CHUNK_RADIUS_Y=18  # Raio vertical do chunk (total: 36 tiles de altura)
```

### Threshold de Ativação
```env
CHUNK_BORDER_THRESHOLD=10  # Distância em tiles da borda que ativa chunk loading
```

## Como Funciona

### 1. Detecção de Proximidade da Borda

O sistema verifica continuamente se o jogador está próximo de qualquer borda do mapa:

```javascript
_isNearBorder(player, map) {
  const threshold = this.env.CHUNK_BORDER_THRESHOLD;
  return (
    player.x < threshold ||
    player.y < threshold ||
    player.x >= (map.width - threshold) ||
    player.y >= (map.height - threshold)
  );
}
```

### 2. Marcação de Viewport como Sujo

Quando o jogador se move, o sistema marca o viewport como "sujo" (precisa ser atualizado) e determina se deve usar chunk loading:

```javascript
markViewportDirty(player) {
  // ... código de detecção de mudança ...
  
  if (map) {
    player._useChunkLoad = this._isNearBorder(player, map);
  }
}
```

### 3. Envio do Viewport/Chunk

No flush do viewport, o sistema escolhe o raio apropriado baseado na flag `_useChunkLoad`:

```javascript
flushViewportIfDirty(player, now) {
  const useChunk = player._useChunkLoad || false;
  
  const radiusX = useChunk ? this.env.MAP_CHUNK_RADIUS_X : this.env.MAP_VIEW_RADIUS_X;
  const radiusY = useChunk ? this.env.MAP_CHUNK_RADIUS_Y : this.env.MAP_VIEW_RADIUS_Y;
  
  const tiles = this.world.mapService.buildViewportPayload(
    map, player.x, player.y, radiusX, radiusY
  );
}
```

## Cenários de Uso

### Cenário 1: Jogador no Centro do Mapa
- **Posição**: (50, 50) em mapa 100x100
- **Distância da borda mais próxima**: 50 tiles
- **Chunk Loading**: NÃO (usa viewport normal)
- **Área carregada**: 36x26 tiles (viewport)

### Cenário 2: Jogador Próximo à Borda Superior
- **Posição**: (50, 5) em mapa 100x100
- **Distância da borda mais próxima**: 5 tiles (< threshold de 10)
- **Chunk Loading**: SIM
- **Área carregada**: 48x36 tiles (chunk)

### Cenário 3: Jogador em um Canto
- **Posição**: (5, 5) em mapa 100x100
- **Distância das bordas**: 5 tiles de duas bordas
- **Chunk Loading**: SIM
- **Área carregada**: 48x36 tiles (chunk)

## Benefícios

1. **Experiência Mais Suave**: Pré-carrega conteúdo antes que fique visível
2. **Performance Otimizada**: Só usa chunk maior quando necessário
3. **Configurável**: Todas as dimensões e threshold são ajustáveis
4. **Transparente**: Funciona automaticamente sem intervenção do cliente

## Impacto na Performance

### Tráfego de Rede
- **Viewport normal**: 36 × 26 = 936 tiles por atualização
- **Chunk**: 48 × 36 = 1,728 tiles por atualização
- **Aumento**: ~84% mais dados quando próximo à borda

### Quando Otimizar
Se o aumento de tráfego for problemático, você pode:
1. Reduzir `MAP_CHUNK_RADIUS_X/Y` para valores menores
2. Aumentar `CHUNK_BORDER_THRESHOLD` para ativar menos frequentemente
3. Ajustar `MAP_MAX_HZ` para limitar frequência de atualizações

## Testes

Execute o teste automatizado para verificar o comportamento:

```bash
node test-chunk-loading.js
```

O teste verifica 8 cenários diferentes:
1. Centro do mapa (sem chunk)
2. Próximo à borda superior (com chunk)
3. Próximo à borda inferior (com chunk)
4. Próximo à borda esquerda (com chunk)
5. Próximo à borda direita (com chunk)
6. Canto superior esquerdo (com chunk)
7. Fora do threshold (sem chunk)
8. Dentro do threshold (com chunk)

## Compatibilidade

- ✅ Compatível com todos os clientes existentes
- ✅ Não requer mudanças no protocolo
- ✅ Funciona com mapas de qualquer tamanho
- ✅ Não afeta jogadores em mapas pequenos (menores que o chunk)

## Troubleshooting

### Problema: Chunk não está sendo carregado
**Solução**: Verifique se `CHUNK_BORDER_THRESHOLD` não está muito pequeno e se `MAP_CHUNK_RADIUS_X/Y` são maiores que `MAP_VIEW_RADIUS_X/Y`.

### Problema: Muito tráfego de rede
**Solução**: Reduza `MAP_CHUNK_RADIUS_X/Y` ou aumente `CHUNK_BORDER_THRESHOLD`.

### Problema: Tiles ainda "pulam" perto das bordas
**Solução**: Aumente `MAP_CHUNK_RADIUS_X/Y` ou diminua `CHUNK_BORDER_THRESHOLD`.

## Arquivos Modificados

- `src/config/env.js` - Adicionadas configurações de chunk
- `src/services/playerService.js` - Implementada lógica de detecção e carregamento
- `.env` - Adicionadas variáveis de configuração
- `test-chunk-loading.js` - Teste automatizado da funcionalidade
- `README.md` - Documentação atualizada
- `CHUNK_LOADING_IMPLEMENTATION.md` - Este documento
