const fetch = require('node-fetch')

module.exports = class {
    constructor(callback) {
        fetch('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1')
        .then(res => res.json())
        .then(data => this.deckId = data.deck_id)
        .then(callback)
    }
    async draw(amount=1) {
        let cards
        await fetch(`https://deckofcardsapi.com/api/deck/${this.deckId}/draw/?count=${amount}`)
        .then(res => res.json())
        .then(res => cards = res.cards)
        .catch(err => setTimeout(() => {this.draw(amount)}, 1000))
        return cards
    }
    async shuffle() {
        return await fetch(`https://deckofcardsapi.com/api/deck/${this.deckId}/shuffle/`)
    }
}