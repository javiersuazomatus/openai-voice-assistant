// chrome.runtime.onInstalled.addListener(() => {
//
//     }
// )
console.log("estoy ON");
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse){
        console.log("an event has been received from" + JSON.stringify(sender));
        console.log(JSON.stringify(request));
        getActions(request.text, request.context);
        sendResponse({"status":"received"});
        return true;
    }
)

function getActions(instruction, context){
    var myHeaders = new Headers();
    myHeaders.append("Authorization", "Bearer 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");
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
        "context": context,
        "text": instruction
    });

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    fetch("http://localhost:8080/beta/process", requestOptions)
        .then(response => {
            console.log(response);
            response.text();
        })
        .then(result => {
            console.log(result);
        })
        .catch(error => console.log('error', error));
}




