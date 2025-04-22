// Bridge script for communication between page context and extension context
window.honeyBarrelBridge = {
  sendMessage: function (message) {
    return new Promise((resolve) => {
      const messageId = Date.now() + Math.random();

      // Set up a listener for the response
      window.addEventListener("message", function listener(event) {
        if (
          event.data.type === "FROM_EXTENSION_TO_PAGE" &&
          event.data.messageId === messageId
        ) {
          window.removeEventListener("message", listener);
          resolve(event.data.response);
        }
      });

      // Send the message to the content script
      window.postMessage(
        {
          type: "FROM_PAGE_TO_EXTENSION",
          message: message,
          messageId: messageId,
        },
        "*"
      );
    });
  },
};

console.log("🌉 Honey Barrel: Bridge script loaded");
