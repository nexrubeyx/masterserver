/**
 * Recipe Service - Gerenciamento de Receitas de Crafting
 * 
 * Este módulo gerencia as receitas (recipes) e dados de construção (build data)
 * que são enviados ao cliente para o sistema de crafting.
 * 
 * Estrutura de uma receita:
 * {
 *   [recipeName]: {
 *     r: {                    // requirements (requisitos)
 *       [itemName]: quantity  // nome do item requerido e quantidade
 *     }
 *   }
 * }
 * 
 * Exemplo:
 * {
 *   "campfire": {
 *     r: {
 *       "wood": 5,
 *       "stone": 3
 *     }
 *   }
 * }
 */

/**
 * Dados de receitas/construção
 * 
 * Por enquanto, retorna um objeto vazio para evitar erros no cliente.
 * As receitas podem ser expandidas futuramente adicionando entradas neste objeto.
 * 
 * O cliente espera que este objeto seja serializável em JSON e contenha
 * a estrutura descrita acima.
 */
const recipeData = {
  // Receitas podem ser adicionadas aqui no futuro
  // Exemplo:
  // "wooden_sword": {
  //   r: {
  //     "wood": 2,
  //     "stone": 1
  //   }
  // }
};

/**
 * Retorna todos os dados de receitas
 * 
 * @returns {Object} Objeto com todas as receitas disponíveis
 * 
 * Este objeto é serializado como JSON e enviado ao cliente no pacote 'bld'.
 */
export function getRecipeData() {
  return recipeData;
}

/**
 * Cria um pacote de receitas para enviar ao cliente
 * 
 * @returns {Object} Pacote no formato esperado pelo cliente
 * 
 * O cliente espera receber um pacote do tipo 'bld' com um campo 'data'
 * contendo a string JSON das receitas.
 */
export function makeRecipePacket() {
  return {
    type: 'bld',
    data: JSON.stringify(recipeData)
  };
}
