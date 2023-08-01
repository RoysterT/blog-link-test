let config = null;
let lineConfig = null;
let pageConfig = null;
fetch("../config.json")
  .then((response) => response.json())
  .then((json) => {
    config = json;
    pageConfig = json.page;
    initPage();
    lineConfig = json.line;
    testMain();
  })
  .catch((error) => {
    console.error("获取JSON文件出错:", error);
  });