// 代码高亮（可选，可引入highlight.js）
document.addEventListener('DOMContentLoaded', () => {
  const codeBlocks = document.querySelectorAll('pre code');
  codeBlocks.forEach(block => {
    block.classList.add('hljs');
    // 若用highlight.js，需引入后调用 hljs.highlightElement(block);
  });
});