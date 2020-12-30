function Card(id, username, image = '/static/img/cardBack.png', livesCount = 3) {
    let lives
    if (livesCount == 0) {
        lives = ''
    }
    else if (livesCount == 1) {
        lives = '♥'
    }
    else if (livesCount == 2) {
        lives = '♥ ♥'
    }
    else if (livesCount == 3) {
        lives = '♥ ♥ ♥'
    }
    document.getElementById(id).innerHTML = `<p style="text-align: center;"><b>${username}</b><br>Lives: ${lives}</p><img id="${id}img" src="${image}">`
}


function copy(text) {
    var textArea = document.createElement("textarea")
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }