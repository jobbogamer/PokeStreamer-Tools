import config from 'config.json';
import ws from './websocket';
import TooltipTemplate from '../templates/tooltip-template.ejs';

if (config.soulLink.linking.method === 'discord') {
    const $discordIndicator = $('.header-icons .discord-indicator');

    ws.on('message', e => {
        let msg = JSON.parse(e.data);
        if (msg.messageType !== 'discord-status') {
            return;
        }
        
        switch (msg.status) {
            case 'open':
                $discordIndicator.removeClass('disconnected unknown').tooltip('dispose');
                if (msg.partnerStatus === 'online') {
                    $discordIndicator.removeClass('partner-offline').tooltip({
                        title: 'Connected',
                        placement: 'left',
                        trigger: 'hover focus',
                        template: TooltipTemplate({ variant: 'discord' })
                    });
                } else {
                    $discordIndicator.addClass('partner-offline').tooltip({
                        title: 'Partner offline',
                        placement: 'left',
                        trigger: 'manual',
                        template: TooltipTemplate({ variant: 'warning' })
                    }).tooltip('show');
                }

                break;

            case 'reconnecting':
                $discordIndicator.addClass('disconnected').removeClass('unknown').tooltip('dispose').tooltip({
                    title: 'Reconnecting...',
                    placement: 'left',
                    trigger: 'manual',
                    template: TooltipTemplate({ variant: 'danger' })
                }).tooltip('show');
                break;

            case 'close':
                $discordIndicator.addClass('disconnected').removeClass('unknown').tooltip('dispose').tooltip({
                    title: 'Disconnected',
                    placement: 'left',
                    trigger: 'manual',
                    template: TooltipTemplate({ variant: 'danger' })
                }).tooltip('show');
                break;
        }

        $discordIndicator.has('i').one('DOMSubtreeModified', function () { 
            $(this).tooltip('update');
        });
    });
}