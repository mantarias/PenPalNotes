const h1 = document.querySelector('h1');
const iframe = document.querySelector('iframe');
const editorElement = document.querySelector('#editor');
let interval;
let que = [];
let socket;
let easyMDE;

addEventListener('load', () => {
    let url = window.location.pathname.split('/');
    let filename = url[url.length - 1];
    h1.textContent = "Editing " + filename;
    iframe.src = "/notes/" + filename;

    // Initialize EasyMDE
    easyMDE = new EasyMDE({
        element: editorElement,
        autofocus: true,
        spellChecker: false,
        toolbar: [
            'bold', 'italic', 'heading', '|',
            'quote', 'code', 'unordered-list', 'ordered-list', '|',
            'link', 'image', '|',
            'preview', 'side-by-side', 'fullscreen', '|',
            'guide'
        ],
        status: false
    });

    // Connect to WebSocket server
    socket = new WebSocket("/ws/" + filename);

    socket.addEventListener('open', () => {
        console.log("WebSocket connection opened");
    });

    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);

        if (data.message != undefined && data.message == "file updated") {
            iframe.contentWindow.location.reload();
            return;
        }

        if (data.content) {
            const cursorPos = easyMDE.codemirror.getCursor();
            easyMDE.value(data.content);
            easyMDE.codemirror.setCursor(cursorPos);
            que = [];
        }
    });

    socket.addEventListener('close', () => {
        console.log("WebSocket connection closed");
    });

    // Listen for changes
    easyMDE.codemirror.on('change', () => {
        que.push({
            content: easyMDE.value(),
            cursorPos: easyMDE.codemirror.getCursor()
        });
        resetTimer();
    });
});

function resetTimer() {
    clearTimeout(interval);
    interval = setTimeout(() => {
        if (que.length > 0) {
            const lastChange = que[que.length - 1];
            socket.send(JSON.stringify({
                content: lastChange.content,
                cursorPos: lastChange.cursorPos
            }));
            que = [];
        }
    }, 1000);
}
