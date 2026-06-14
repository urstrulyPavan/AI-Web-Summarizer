document.addEventListener("DOMContentLoaded", function () {

    const button = document.getElementById("btn");
    const message = document.getElementById("message");

    if (!button || !message) {
        console.error("Elements not found");
        return;
    }

    button.addEventListener("click", function () {

        message.textContent = "Loading summary...";

        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {

                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { type: "GET_TEXT" },

                    async function (response) {

                        if (!response || !response.text) {
                            message.textContent =
                                "Could not read page text.";
                            return;
                        }

                        try {

                            /* LIMIT TEXT SIZE */
                            const pageText =
                                response.text.slice(0, 2000);

                            const result = await fetch(
                                "http://localhost:3000/summarize",
                                {
                                    method: "POST",
                                    headers: {
                                        "Content-Type":
                                            "application/json"
                                    },
                                    body: JSON.stringify({
                                        text: pageText
                                    })
                                }
                            );

                            const data =
                                await result.json();

                            message.textContent =
                                data.summary;

                        } catch (error) {

                            message.textContent =
                                "Error: " +
                                error.message;

                        }

                    }
                );

            }
        );

    });

});