import ws from './websocket';
import Icons from '../../pokemon-icons';
import TooltipTemplate from '../templates/tooltip-template.ejs';
import TraitsCell from '../templates/traits-cell.ejs';

export default class ManagerRow {
    constructor(msg) {
        this.setErrorState = this.setErrorState.bind(this);
        this.clearErrorState = this.clearErrorState.bind(this);
        this.sendSetStatic = this.sendSetStatic.bind(this);
        
        let pokemon = this.pokemon = msg.pokemon;
        this.pid = parseInt(pokemon.pid);

        pokemon.static = pokemon.staticId > 0 ? 'static' : '';
        pokemon.icon = Icons.getIcon(pokemon);
    }

    addRow($container, $newRow) {
        this.removeRow();

        this.$row = $newRow;
        this.defaultRowClasses = this.$row.attr('class');
        $container.prepend(this.$row);
        
        setTimeout(() => {
            this.$row.addClass('show');
            this.$row.find('.traits').find('.icon[data-toggle="tooltip"]').tooltip().end()
                .find('.dropdown .dropdown-menu .dropdown-item').on('click', this.sendSetStatic);
        }, 20);
        
        return this.$row;
    }

    removeRow() {
        if (this.$row) {
            let $oldRow = this.$row.attr('id', '').removeClass('show');
            this.$row = null;

            setTimeout(() => $oldRow.remove(), 500);
            return $oldRow;
        }

        return null;
    }

    handleMessage(msg) {
        let pid = parseInt(msg.pid);
        if (!pid || pid !== this.pid) {
            console.error(`Row ${this.pid} received mismatched message type '${msg.messageType}' from soullink-manager for pid ${pid}`);
            // prevent bubbling
            return true;
        }

        this.clearErrorState();

        switch (msg.messageType) {
            case 'set-static-pokemon':
                let pokemon = this.pokemon;
                pokemon.staticId = msg.setStatic ? 9999 : -2;
                pokemon.static = pokemon.staticId > 0 ? 'static' : '';

                let $traitsCell = $(TraitsCell(this));
                $traitsCell.find('.dropdown .dropdown-menu .dropdown-item').on('click', this.sendSetStatic);
                this.$row.find('.traits').replaceWith($traitsCell).end().find('.icon[data-toggle="tooltip"]').tooltip();
                return true;

            case 'error':
                this.setErrorState(msg.errorMessage);
                return true;

            default:
                return false;
        }
    }

    sendMessage(msg) {
        this.$row.removeClass('bg-danger text-white').addClass(this.defaultRowClasses).find('button, select').disable();
        this.reenableTimeout = setTimeout(() => this.setErrorState(`There was no response from the server.`), 5000);

        msg.pid = this.pid;
        ws.send(JSON.stringify(msg));
    }

    setErrorState(message) {
        this.$row.removeClass(this.defaultRowClasses);
        this.$row.addClass('bg-danger text-white').find('button, select').enable().filter('select').change();
        if (message) {
            console.error(message);
            this.$row.tooltip({
                title: message,
                container: 'body',
                template: TooltipTemplate({ variant: 'danger' }),
            });
        } else {
            this.$row.tooltip('dispose');
        }

        clearTimeout(this.reenableTimeout);
    }

    clearErrorState() {
        this.$row.removeClass('bg-danger text-white').addClass(this.defaultRowClasses)
            .tooltip('dispose').find('button, select').enable().filter('select').change();
        clearTimeout(this.reenableTimeout);
    }

    sendSetStatic(e) {
        let $item = $(e.target),
            setStatic = $item.closest('.dropdown-item').is('.item-static');

        let msg = {
            messageType: 'set-static-pokemon',
            setStatic
        };

        this.sendMessage(msg);
    }
}