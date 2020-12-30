const socket = io()
let emits
let server_token

function load_token(socket) {
    if (sessionStorage.getItem('token')) {
        socket.emit('reconnect_user', {token:sessionStorage.getItem('token')})
    }
    else {
        let step = 0
        let token = ''
        while (step <= 50) {
            token += btoa(Math.floor(Math.random() * 1000000000000000000000))
            step++
        }
        socket.emit('add_user', {token:token})
        sessionStorage.setItem('token', token)
    }
    return sessionStorage.getItem('token')
}

function set_emit_on(socket, token) {
    return {
        'emit' : (event, data) => {
            return socket.emit(token + event, {token:server_token, body:data})
            
        },
        'on' : (event, func) => {
            return socket.on(token + event, (data) => {
                func(data.body, data.token)
            })
        }
    }
}

function start_particles() {
  tsParticles.load('particles', {
    "fpsLimit": 60,
    "particles": {
      "number": {
        "value": 80,
        "density": {
          "enable": true,
          "value_area": 800
        }
      },
      "color": {
        "value": "#ff0000",
        "animation": {
          "enable": true,
          "speed": 20,
          "sync": true
        }
      },
      "shape": {
        "type": "circle",
        "stroke": {
          "width": 0
        },
        "polygon": {
          "nb_sides": 5
        },
      },
      "opacity": {
        "value": 0.5,
        "random": false,
        "anim": {
          "enable": false,
          "speed": 3,
          "opacity_min": 0.1,
          "sync": false
        }
      },
      "size": {
        "value": 3,
        "random": true,
        "anim": {
          "enable": false,
          "speed": 20,
          "size_min": 0.1,
          "sync": false
        }
      },
      "links": {
        "enable": true,
        "distance": 100,
        "color": "#ffffff",
        "opacity": 0.4,
        "width": 1
      },
      "move": {
        "enable": true,
        "speed": 6,
        "direction": "none",
        "random": false,
        "straight": false,
        "out_mode": "out",
        "attract": {
          "enable": false,
          "rotateX": 600,
          "rotateY": 1200
        }
      }
    },
    "interactivity": {
      "detect_on": "canvas",
      "events": {
        "onhover": {
          "enable": true,
          "mode": "repulse"
        },
        "onclick": {
          "enable": true,
          "mode": "push"
        },
        "resize": true
      },
      "modes": {
        "grab": {
          "distance": 400,
          "line_linked": {
            "opacity": 1
          }
        },
        "bubble": {
          "distance": 400,
          "size": 40,
          "duration": 2,
          "opacity": 0.8
        },
        "repulse": {
          "distance": 200
        },
        "push": {
          "particles_nb": 4
        },
        "remove": {
          "particles_nb": 2
        }
      }
    },
    "retina_detect": true,
    "background": {
      "color": "#000000",
      "image": "",
      "position": "50% 50%",
      "repeat": "no-repeat",
      "size": "cover"
    }
  })
}

$(document).ready(() => {
  server_token = load_token(socket)
  emits = set_emit_on(socket, server_token)
  let pingRes = () => {}
  $('body').css('animationPlayState', 'running')
  $('button').click(() => {
    $('body').css('opacity', '0')
    $('body').addClass('leaving')
  })
  emits.on('error', (body, token) => {
    window.location.href = `/error#${btoa(JSON.stringify(body))}`
  })
  emits.on('pingRes', (body, token) => {
    pingRes(body)
  })
  window.ping = (callback = console.log) => {
    pingRes = callback
    emits.emit('ping', Date.now())
  }
  if (localStorage.getItem('particles') != 'off') {
    start_particles()
  }
  if (typeof(page_onload) != 'undefined') {
      page_onload()
  }
})
