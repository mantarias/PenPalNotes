const filesDiv = document.querySelector('#files');
const filenameInput = document.querySelector('#filename');

function createFile() {
    const filename = filenameInput.value.trim();
    if (!filename) {
        alert('Please enter a filename');
        return;
    }
    if (!filename.endsWith('.md')) {
        alert('Filename must end with .md');
        return;
    }

    fetch("/createFile", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            loadFiles();
            filenameInput.value = '';
        } else {
            alert(data.message || 'Failed to create file');
        }
    });
}

function deleteFile(filename) {
    if (confirm(`Are you sure you want to delete ${filename}?`)) {
        fetch("/deleteFile", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                loadFiles();
            } else {
                alert(data.message || 'Failed to delete file');
            }
        });
    }
}

function loadFiles() {
    filesDiv.innerHTML = '<h2>Available files</h2>';
    fetch("/getFiles")
        .then(res => res.json())
        .then(data => {
            data.files.forEach(file => {
                const container = document.createElement('div');
                container.className = 'file-container';

                const a = document.createElement('a');
                a.href = "editor/" + file;
                a.textContent = file;

                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'delete-btn';
                deleteBtn.textContent = '🗑️';
                deleteBtn.onclick = () => deleteFile(file);

                container.appendChild(a);
                container.appendChild(deleteBtn);
                filesDiv.appendChild(container);
            });
        });
}

addEventListener('load', loadFiles);
