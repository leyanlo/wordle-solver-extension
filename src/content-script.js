(async () => {
  const src = chrome.runtime.getURL("js/main.js");
  const contentMain = await import(src);
  contentMain.main();
})();
