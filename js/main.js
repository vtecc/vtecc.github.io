// PureGuide 内置脚本，无外部依赖
document.addEventListener('DOMContentLoaded', ()=>{
    //简易页面搜索逻辑
    const searchInput = document.getElementById('searchInput');
    const resultBox = document.getElementById('searchResult');
    if(searchInput && resultBox){
        //你可以后续接入hexo-generator-search生成xml数据
        searchInput.addEventListener('input', function(){
            resultBox.innerHTML = "<p>请配置 hexo-generator-search 插件启用搜索</p>"
        })
    }
})