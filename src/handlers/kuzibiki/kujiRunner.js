/**
 * 配列から指定された回数だけランダムに要素を抽出する（重複あり）
 * @param {string[]} list - くじの項目配列
 * @param {number} count - 抽出回数
 * @returns {string[]}
 */
function runKuji(list, count) {
  const results = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * list.length);
    results.push(list[randomIndex]);
  }
  return results;
}

module.exports = { runKuji };