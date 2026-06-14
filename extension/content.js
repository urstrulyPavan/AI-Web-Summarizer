chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

    if (request.type === "GET_TEXT") {
        const pageText = document.body.innerText;
        
        sendResponse({
            text: pageText
        });

    }

});