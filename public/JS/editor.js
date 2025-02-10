const h1 = document.querySelector('h1');
const iframe = document.querySelector('iframe');
const editor = document.querySelector('#editor');
let changed = false;
let timeout;
let old = "";
let changes = [];
addEventListener('load', () => {
    let url = window.location.pathname.split('/');
    let filename = url[url.length - 1];
    h1.textContent = "Editing " + filename;
    iframe.src = "http://127.0.0.1:8000/" + filename.replace(".md", "");
    // Connect to WebSocket server
    const socket = new WebSocket("ws://127.0.0.1:3001/ws/" + filename);

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
        old = data.list.join("");
        editor.value = old;
        changed = true;


    });

    socket.addEventListener('close', () => {
        console.log("WebSocket connection closed");
    });

    editor.addEventListener('input', () => {
        if (changed) {
            changed = false;
        }
        else {
            clearTimeout(timeout);
            timeout = setTimeout(() => {

                for (let index = 0, index2 = 0; index2 < editor.value.length; index++, index2++) {
                    if (old[index] != editor.value[index2]) {
                        changes.push({ at: index2, input: editor.value[index2], method: "insert" })
                        for (let i = 1; i < editor.value.length - index2; i++) {
                            if (old[index] != editor.value[index2 + i]) {
                                changes[changes.length - 1].input += editor.value[index2 + i]
                            }
                            else {
                                break
                            }
                        }
                        index2 += changes[changes.length - 1].input.length;



                    }

                }
                console.log(changes)
                let modified = editor.value;
                for (let i2 = changes.length - 1; i2 >= 0; i2--) {
                    if (changes[i2].method == "insert") {

                        let start = modified.slice(0, changes[i2].at);
                        let end = modified.slice(changes[i2].at + changes[i2].input.length);
                        modified = start + end;

                    }
                    else if (changes[i2] == "deleted") {
                        let start = modified.slice(0, index)
                        let end = modified.slice(index + 1)
                        modified = start + end;
                    }


                }
                if (modified == old) {
                    old = editor.value;
                    console.log("sending")
                    socket.send(JSON.stringify(changes));
                    changes = [];
                    return;
                }
                old = editor.value;

            }, 1000);
        }





    });
    editor.addEventListener("keydown", (event) => {
        let key = event.keyCode || event.charCode;
        if (key == 8 || key == 46) {
            timeout2 = setTimeout(() => {
                for (let index = old.length; index >= 0; index--) {
                    let modified = old;
                    if (old[index] != editor.value[index]) {
                        changes.push({ at: index, method: "deleted" })
                        let start = modified.slice(0, index)
                        let end = modified.slice(index + 1)
                        old = start + end;
                    }

                }
                console.log(changes);
                console.log(old.length);
                socket.send(JSON.stringify(changes));
                changes = [];
            }, 100);
        }
    });

});
