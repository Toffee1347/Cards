const fetch = require('node-fetch')

class Deck {
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
        return cards
    }
    async shuffle() {
        return await fetch(`https://deckofcardsapi.com/api/deck/${this.deckId}/shuffle/`)
    }
}

module.exports = Deck