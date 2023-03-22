// chrome.runtime.onInstalled.addListener(() => {
//
//     }
// )
console.log("estoy ON");
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse){
        console.log("an event has been received from" + JSON.stringify(sender));
        console.log(JSON.stringify(request));
        sendResponse({"status":"received"});
    }
)




