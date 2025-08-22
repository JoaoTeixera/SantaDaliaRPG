// --- INICIALIZAÇÃO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDFZFLYTGjri4MMjdbMYDOwyXaXt09JuuI",
    authDomain: "santadaliarpg.firebaseapp.com",
    databaseURL: "https://santadaliarpg-default-rtdb.firebaseio.com",
    projectId: "santadaliarpg",
    storageBucket: "santadaliarpg.appspot.com",
    messagingSenderId: "499029720670",
    appId: "1:499029720670:web:2d32f179243252ec503ecf",
    measurementId: "G-TT7MV3NB0B"
};
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();
const notesRef = db.ref('whiteboard_notes');
const documentsRef = db.ref('documents'); // Documentos originais
const userDocsRef = db.ref('user_documents'); // Documentos dos jogadores

// --- RENDERIZAÇÃO DA LISTA DE DOCUMENTOS ---
function renderDocumentList() {
    const container = document.getElementById('document-grid-container');
    if (!container) return;

    // Limpa o container para evitar duplicados ao recarregar
    container.innerHTML = '';

    // 1. Ouve e renderiza os documentos originais
    documentsRef.on('value', (snapshot) => {
        const documents = snapshot.val();
        if (documents) {
            Object.keys(documents).forEach(key => {
                // Evita redesenhar se o elemento já existir
                if (!document.getElementById(key)) {
                    renderSingleDocument(key, documents[key], container, false);
                }
            });
        }
    });

    // 2. Ouve e renderiza os documentos dos jogadores
    userDocsRef.on('value', (snapshot) => {
        // Remove apenas os documentos antigos dos jogadores para atualizar a lista
        document.querySelectorAll('.user-document').forEach(el => el.remove());
        const userDocuments = snapshot.val();
        if (userDocuments) {
            Object.keys(userDocuments).forEach(key => {
                renderSingleDocument(key, userDocuments[key], container, true);
            });
        }
    });
}

// Função auxiliar para criar o HTML de um único documento
function renderSingleDocument(key, doc, container, isUserDoc) {
    const cardClasses = isUserDoc ? 'user-document' : 'document-card';
    const borderColor = doc.borderColor || 'border-indigo-400'; // Cor padrão para uploads

    const cardHTML = `
        <div id="${key}" class="${cardClasses} bg-white rounded-lg shadow-lg p-6 border-l-4 ${borderColor} flex flex-col">
            <img src="${doc.image}" alt="${doc.title}" class="mb-4 rounded">
            <h2 class="text-xl font-bold mb-2 flex items-center"><i class="${doc.icon || 'ri-attachment-line'} mr-2"></i>${doc.title}</h2>
            ${doc.details ? `<p class="text-gray-700 mb-2">${doc.details}</p>` : ''}
            ${doc.description ? `<p class="text-gray-600 flex-grow">${doc.description}</p>` : ''}
            <button class="add-to-board-btn mt-4 bg-gray-700 text-white font-bold py-2 px-4 rounded hover:bg-gray-800 transition">Adicionar ao Quadro</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', cardHTML);
}

// --- LÓGICA DE UPLOAD DE DOCUMENTOS (BASE64) ---
const uploadForm = document.getElementById('upload-doc-form');
const docTitleInput = document.getElementById('doc-title-input');
const docFileInput = document.getElementById('doc-file-input');
const uploadStatus = document.getElementById('upload-status');

uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const file = docFileInput.files[0];
    const title = docTitleInput.value.trim();

    if (!file || !title) {
        alert('Por favor, preencha o título e selecione um ficheiro.');
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        uploadStatus.textContent = 'Erro: O ficheiro é maior que 2MB.';
        alert('O ficheiro é muito grande. Por favor, escolha uma imagem com menos de 2MB.');
        return;
    }

    uploadStatus.textContent = 'A processar imagem...';

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = () => {
        const base64Image = reader.result;
        const newDocument = {
            title: title,
            image: base64Image,
        };
        userDocsRef.push(newDocument)
            .then(() => {
                uploadStatus.textContent = 'Enviado com sucesso!';
                uploadForm.reset();
                setTimeout(() => { uploadStatus.textContent = ''; }, 3000);
            })
            .catch((error) => {
                console.error("Erro ao guardar no Realtime Database: ", error);
                uploadStatus.textContent = 'Erro ao guardar. Tente novamente.';
            });
    };

    reader.onerror = (error) => {
        console.error("Erro ao ler o ficheiro: ", error);
        uploadStatus.textContent = 'Erro ao processar o ficheiro.';
    };
});

// --- LÓGICA DO WHITEBOARD ---
const viewport = document.getElementById('whiteboard-viewport');
const canvas = document.getElementById('whiteboard-canvas');
const whiteboardForm = document.getElementById('whiteboardForm');
const noteAuthorInput = document.getElementById('noteAuthor');
const noteContentInput = document.getElementById('noteContent');

let scale = 1, panX = 0, panY = 0, isPanning = false, panStartX, panStartY;

function applyTransform() {
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const dir = e.deltaY < 0 ? 1 : -1;
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const newScale = Math.max(0.2, Math.min(3, scale + dir * zoomIntensity));
    panX = mouseX - (mouseX - panX) * (newScale / scale);
    panY = mouseY - (mouseY - panY) * (newScale / scale);
    scale = newScale;
    applyTransform();
});

viewport.addEventListener('mousedown', (e) => {
    if (e.target === viewport || e.target === canvas) {
        isPanning = true;
        panStartX = e.clientX - panX;
        panStartY = e.clientY - panY;
    }
});
document.addEventListener('mousemove', (e) => {
    if (isPanning) {
        panX = e.clientX - panStartX;
        panY = e.clientY - panStartY;
        applyTransform();
    }
});
document.addEventListener('mouseup', () => { isPanning = false; });

document.getElementById('zoom-in-btn').addEventListener('click', () => { scale = Math.min(3, scale * 1.2); applyTransform(); });
document.getElementById('zoom-out-btn').addEventListener('click', () => { scale = Math.max(0.2, scale / 1.2); applyTransform(); });
document.getElementById('zoom-reset-btn').addEventListener('click', () => { scale = 1; panX = 0; panY = 0; applyTransform(); });

whiteboardForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const author = noteAuthorInput.value.trim();
    const content = noteContentInput.value.trim();
    if (author && content) {
        notesRef.push({
            type: 'text', author, content,
            x: (viewport.clientWidth / 2 - panX) / scale - 96,
            y: (viewport.clientHeight / 2 - panY) / scale - 64,
            width: 192, height: 128,
        });
        noteContentInput.value = '';
    }
});

document.getElementById('documentos').addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-board-btn')) {
        const card = e.target.closest('.document-card, .user-document');
        if (card) {
            const title = card.querySelector('h2').innerText;
            const imgSrc = card.querySelector('img').src;
            notesRef.push({
                type: 'document', title, imageSrc: imgSrc,
                x: (viewport.clientWidth / 2 - panX) / scale - 112,
                y: (viewport.clientHeight / 2 - panY) / scale - 125,
                width: 224, height: 250,
            });
        }
    }
});

notesRef.on('value', (snapshot) => {
    canvas.innerHTML = '';
    snapshot.forEach((childSnapshot) => {
        renderNote(childSnapshot.key, childSnapshot.val());
    });
});

function renderNote(noteId, noteData) {
    const noteElement = document.createElement('div');
    noteElement.style.left = `${noteData.x}px`;
    noteElement.style.top = `${noteData.y}px`;
    noteElement.style.width = `${noteData.width}px`;
    noteElement.style.height = `${noteData.height}px`;

    let innerHTML = '';
    if (noteData.type === 'document') {
        noteElement.className = 'absolute bg-white p-2 rounded shadow-lg cursor-grab active:cursor-grabbing border-2 border-gray-400 flex flex-col';
        innerHTML = `<div class="note-content flex-grow flex flex-col"><img src="${noteData.imageSrc}" alt="${noteData.title}" class="w-full object-contain flex-grow mb-2 rounded-sm" draggable="false"/><h4 class="text-sm font-bold text-gray-800 text-center flex-shrink-0">${noteData.title}</h4></div><button class="delete-btn absolute -top-2 -right-2 text-white bg-red-600 rounded-full h-6 w-6 flex items-center justify-center font-bold hover:bg-red-800 z-20">X</button>`;
    } else {
        noteElement.className = 'absolute bg-yellow-200 p-4 rounded shadow-lg cursor-grab active:cursor-grabbing flex flex-col';
        innerHTML = `<div class="note-content flex-grow"><p class="font-sans text-sm text-gray-800">${noteData.content}</p></div><small class="font-bold text-xs text-gray-600 block mt-2 flex-shrink-0">- ${noteData.author}</small><button class="delete-btn absolute top-1 right-1 text-red-600 hover:text-red-800 font-bold z-20">X</button>`;
    }
    
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    noteElement.innerHTML = innerHTML;
    noteElement.appendChild(resizeHandle);
    canvas.appendChild(noteElement);

    let isDragging = false, isResizing = false;
    let dragStartX, dragStartY, resizeStartX, resizeStartY, initialWidth, initialHeight;

    noteElement.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('resize-handle') || e.target.classList.contains('delete-btn')) return;
        e.stopPropagation();
        isDragging = true;
        dragStartX = (e.clientX - panX) / scale;
        dragStartY = (e.clientY - panY) / scale;
        noteElement.style.zIndex = 1000;
    });

    resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        isResizing = true;
        noteElement.style.zIndex = 1000;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        initialWidth = noteData.width;
        initialHeight = noteData.height;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const mouseX = (e.clientX - panX) / scale;
            const mouseY = (e.clientY - panY) / scale;
            noteElement.style.left = `${noteData.x + (mouseX - dragStartX)}px`;
            noteElement.style.top = `${noteData.y + (mouseY - dragStartY)}px`;
        }
        if (isResizing) {
            const deltaX = (e.clientX - resizeStartX) / scale;
            const deltaY = (e.clientY - resizeStartY) / scale;
            noteElement.style.width = `${Math.max(100, initialWidth + deltaX)}px`;
            noteElement.style.height = `${Math.max(80, initialHeight + deltaY)}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            noteElement.style.zIndex = 10;
            notesRef.child(noteId).update({ x: parseInt(noteElement.style.left), y: parseInt(noteElement.style.top) });
        }
        if (isResizing) {
            isResizing = false;
            noteElement.style.zIndex = 10;
            const finalWidth = parseInt(noteElement.style.width);
            const finalHeight = parseInt(noteElement.style.height);
            noteData.width = finalWidth;
            noteData.height = finalHeight;
            notesRef.child(noteId).update({ width: finalWidth, height: finalHeight });
        }
    });

    const deleteBtn = noteElement.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja apagar esta nota do quadro?')) {
            notesRef.child(noteId).remove();
        }
    });
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    renderDocumentList();
});
