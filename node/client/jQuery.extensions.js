$.fn.resetText = function () {
    return this.text('').css('font-size', '').find('.scaled').children().unwrap('.scaled');
};

$.fn.enable = function () {
    return this.removeAttr('disabled').removeClass('disabled');
};

$.fn.disable = function () {
    return this.attr('disabled', 'disabled').addClass('disabled');
};

function mergeRect(r1, r2) {
    if (r1 === null) {
        if (r2 === null) {
            return null;
        }

        return r2;
    }
    else if (r2 === null) {
        return r1;
    }

    return {
        top: Math.min(r1.top, r2.top),
        bottom: Math.max(r1.bottom, r2.bottom),
        left: Math.min(r1.left, r2.left),
        right: Math.max(r1.right, r2.right),
    };
}

$.fn.getContentBounds = function () {
    let rect = {
        top: Infinity,
        bottom: -Infinity,
        left: Infinity,
        right: -Infinity,
    };

    for (let el of this.contents().filter(e => e.nodeType === 3 || $(e).not(':empty'))) {
        let elRect;
        if (el.nodeType !== 3) {
            elRect = mergeRect(el.getBoundingClientRect(), $(el).getContentBounds());
        } else {
            let r = document.createRange();
            r.selectNodeContents(el);
            elRect = r.getBoundingClientRect();
        }

        if (elRect.width === 0 || elRect.height === 0) {
            elRect = null;
        }

        rect = mergeRect(rect, elRect);
    }

    if (rect.top === Infinity ||
        rect.bottom === -Infinity ||
        rect.left === Infinity ||
        rect.right === -Infinity) {
        return null;
    }

    rect.width = Math.max(0, rect.right - rect.left);
    rect.height = Math.max(0, rect.bottom - rect.top);

    return rect;
};

$.fn.scaleToFit = function () {
    this.each(function () {
        let $this = $(this),
            cBounds = $this.getContentBounds(),
            $parent = $this.parent(),
            pWidth = $parent.width(),
            pHeight = $parent.height(),
            scale = !cBounds ? 1 : Math.min(1, pWidth / cBounds.width, pHeight / cBounds.height);

        if (scale !== 1) {
            let $scaleWrapper = $('<span>').addClass('scaled').css('font-size', `${scale}em`);

            let scaleText = function () {
                if (this.nodeType === 3) {
                    if (this.textContent.trim()) {
                        $(this).wrap($scaleWrapper);
                    }
                } else {
                    $(this).contents().each(scaleText);
                }
            };

            $this.contents(scaleText).each(scaleText);
        }
    });

    return this;
};