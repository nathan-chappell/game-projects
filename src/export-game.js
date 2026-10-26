// The downloadable game contains all of its code, styles, and pictures.
// We replace only its room data, so a player's Build edits travel with the file.
export async function downloadGame(project) {
  let copy;

  if (document.getElementById('gameCode')) {
    // A built game already has everything inside this page, including this code.
    copy = document.documentElement.cloneNode(true);
  } else {
    // During development, Vite builds a fresh copy from the current source files.
    const response = await fetch('/__game-export');
    if (!response.ok) throw new Error('The game export could not be built.');
    copy = new DOMParser().parseFromString(await response.text(), 'text/html').documentElement;
  }

  copy.querySelector('#projectData').textContent = JSON.stringify(project)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  // Menus open in the editor should be closed when someone opens the download.
  for (const dialog of copy.querySelectorAll('dialog')) dialog.removeAttribute('open');
  copy.querySelector('#dialogue').hidden = true;
  copy.querySelector('#toast').hidden = true;

  const file = new Blob(['<!doctype html>\n' + copy.outerHTML], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Two-Worlds-My-Game.html';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
