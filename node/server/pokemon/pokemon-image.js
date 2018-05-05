export default class PokemonImage {
    constructor() {
        this.base = null;
        this.female = null;
        this.shiny = null;
        this.shinyFemale = null;
        this.forms = {};
    }
    
    getImage(female, shiny, form, egg) {
        if (form && this.forms[form]) {
            return this.forms[form].getImage(female, shiny) || this.base;
        }
        
        if (female && shiny) {
            return this.shinyFemale || this.shiny || this.female || this.base;
        } else if (female) {
            return this.female || this.base;
        } else if (shiny) {
            return this.shiny || this.base;
        } else {
            return this.base;
        }
    }
}