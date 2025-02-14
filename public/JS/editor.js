const h1 = document.querySelector('h1');
const iframe = document.querySelector('iframe');
const editor = document.querySelector('#editor');
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
        editor.focus();
        console.log(data);
        if (data.changes != undefined) {
            for (let index = 0; index < data.changes.length; index++) {
                const change = data.changes[index];

                quill.updateContents(change);
            }

            que = [];
            console.log(que)
        }
        else {
            old = data.list.join("");
            quill.setContents([{ insert: old }]);
            que = [];
        }


    });

    socket.addEventListener('close', () => {
        console.log("WebSocket connection closed");
    });

    quill.on('text-change', (delta, oldDelta, source) => {
        if (source == 'api') {
            // quill.setSelection(position);
        } else if (source == 'user') {
            // que.push({ old: oldDelta, to: dque.push({old : oldDelta, to : delta});elta });
            que.push(delta);
            resetTimer();
        }
    });

    quill.root.addEventListener("paste",(e)=>{
        console.log(que[que.length-1])
        que[que.length-1].ops = que[que.length-1].ops.reverse();
    })


    // editor.addEventListener("keydown", (event) => {
    //     const key = event.keyCode || event.charCode;
    //     if (key == 8 || key == 46) {
    //         setTimeout(() => {
    //             que.push({ from: old.replaceAll("</br>", "\n"), to: editor.textContent.length > 0 ? editor.textContent.replaceAll("</br>", "\n") : "", method: "deleted" })
    //             old = editor.textContent.replaceAll("</br>", "\n")
    //             resetTimer();
    //         }, 100);
    //     }
    // });

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
        // }
    }, 1000);

}