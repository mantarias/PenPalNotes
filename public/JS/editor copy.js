const h1 = document.querySelector('h1');
const iframe = document.querySelector('iframe');
const editor = document.querySelector('#editor');
let changed = false;
let interval;
let que = [];
let socket;
let quill
addEventListener('load', () => {
    quill = new Quill('#editor', {
        theme: 'snow'
      });
    let url = window.location.pathname.split('/');
    let filename = url[url.length - 1];
    h1.textContent = "Editing " + filename;
    iframe.src = "/notes/" + filename;
    // Connect to WebSocket server
    socket = new WebSocket("/ws/" + filename);

    socket.addEventListener('open', () => {
        console.log("WebSocket connection opened");
    });

    socket.addEventListener('message', (event) => {
        console.log("got message")
        const data = JSON.parse(event.data);
        // for (let index = 0; index <= data.list.length; index++) {
        //     if (data.list[index] == old[index]) {
        //         continue;
        //     }
        //     else {
        //         editor.value = data.list[index];
        //         old = data.list;
        //         break;
        //     }
        // }
        if (data.message != undefined && data.message == "file updated") {
            iframe.contentWindow.location.reload();
            return;
        }
        old = data.list.join("");
        quill.setText(old);
        changed = true;

    });

    socket.addEventListener('close', () => {
        console.log("WebSocket connection closed");
    });

    editor.addEventListener('input', () => {
        if (changed) {
            changed = false;
            resetTimer();
        }
        else {
            setTimeout(() => {
                que.push({ from: old.replaceAll("</br>","\n"), to: editor.textContent.length > 0 ? editor.textContent.replaceAll("</br>","\n") : "", method: "insert" })
                old = editor.textContent.replaceAll("</br>","\n")
                resetTimer();
            }, 100);
        }






    });
    editor.addEventListener("keydown", (event) => {
        const key = event.keyCode || event.charCode;
        if (key == 8 || key == 46) {
            setTimeout(() => {
                que.push({ from: old.replaceAll("</br>","\n"), to: editor.textContent.length > 0 ? editor.textContent.replaceAll("</br>","\n") : "", method: "deleted" })
                old = editor.textContent.replaceAll("</br>","\n")
                resetTimer();
            }, 100);
        }
    });

});

function resetTimer() {
    clearTimeout(interval);
    interval = setTimeout(() => {
        // for (let i = 0; i < que.length; i++) {
        //     if (que[i].method == "insert" && que[i - 1 >= 0 ? 0 : 0].method == "deleted" && que[i - 1 >= 0 ? 0 : 0].from == que[i].from && que[i - 1 >= 0 ? 0 : 0].to == que[i].to) {
        //         continue;
        //     }
        //     else if (que[i].method == "insert" && que[i].from == que[i].to) {
        //         continue;
        //     }
        //     console.log(que[i])
        socket.send(JSON.stringify(que));
        changed = true;
        // }
        que = [];
    }, 1000);

}