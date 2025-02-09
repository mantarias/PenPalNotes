const filesDiv = document.querySelector('#files');
addEventListener('load', () => {
    fetch("/getFiles").then(res => res.json()).then(data => {
        data.files.forEach(file => {
            const a = document.createElement('a');
            a.href = "editor/" + file;
            a.textContent = file;
            filesDiv.appendChild(a);

        });
    });
});