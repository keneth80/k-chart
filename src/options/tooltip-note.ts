import type {
    KChartSeries,
    KChartState,
    KChartTooltipNote,
    KChartTooltipNoteConfiguration,
    KChartTooltipNoteOption
} from '../core/contracts';

export interface KChartTooltipNoteCandidate<T = any> {
    data: T;
    series: KChartSeries<T>;
    x: number;
    y: number;
    color: string;
    html: string;
}

const notesByState = new WeakMap<object, KChartTooltipNote<any>[]>();
let tooltipNoteId = 0;

export const createTooltipNoteOption = <T = any>(
    config: KChartTooltipNoteConfiguration<T> = {}
): KChartTooltipNoteOption<T> => ({
    type: 'tooltip-note',
    visible: config.enabled ?? true,
    config
});

export const resolveTooltipNoteConfiguration = <T = any>(
    state: KChartState<T>
): Required<
    Pick<
        KChartTooltipNoteConfiguration<T>,
        'enabled' | 'maxNotes' | 'pinButtonLabel' | 'notePlaceholder'
    >
> & Pick<KChartTooltipNoteConfiguration<T>, 'onChange'> | undefined => {
    const option = state.config.options?.find(
        (item): item is KChartTooltipNoteOption<T> =>
            item.type === 'tooltip-note' && item.visible !== false
    );
    if (!option) {
        return undefined;
    }

    return {
        enabled: option.config?.enabled ?? option.visible !== false,
        maxNotes: Math.max(1, option.config?.maxNotes ?? 8),
        pinButtonLabel: option.config?.pinButtonLabel ?? 'Pin',
        notePlaceholder: option.config?.notePlaceholder ?? 'Add a note...',
        onChange: option.config?.onChange
    };
};

const getNotes = <T = any>(state: KChartState<T>): KChartTooltipNote<T>[] => {
    const notes = notesByState.get(state);
    if (notes) {
        return notes;
    }
    const next: KChartTooltipNote<T>[] = [];
    notesByState.set(state, next);
    return next;
};

const notifyChange = <T = any>(state: KChartState<T>): void => {
    const config = resolveTooltipNoteConfiguration(state);
    config?.onChange?.(getNotes(state).map((note) => ({...note})));
};

export const pinTooltipNote = <T = any>(
    state: KChartState<T>,
    candidate: KChartTooltipNoteCandidate<T>
): KChartTooltipNote<T> | undefined => {
    const config = resolveTooltipNoteConfiguration(state);
    if (!config?.enabled) {
        return undefined;
    }

    const notes = getNotes(state);
    if (notes.length >= config.maxNotes) {
        notes.shift();
    }
    const note: KChartTooltipNote<T> = {
        id: `kchart-tooltip-note-${tooltipNoteId += 1}`,
        seriesSelector: candidate.series.selector,
        seriesName: candidate.series.displayName ?? candidate.series.selector,
        x: candidate.x,
        y: candidate.y,
        color: candidate.color,
        html: candidate.html,
        note: '',
        data: candidate.data
    };
    notes.push(note);
    notifyChange(state);
    renderTooltipNotes(state);
    return note;
};

export const renderTooltipNotes = <T = any>(
    state: KChartState<T>
): void => {
    const config = resolveTooltipNoteConfiguration(state);
    const notes = config?.enabled ? getNotes(state) : [];
    const layer = state.container
        .selectAll<HTMLDivElement, unknown>('div.kchart-tooltip-note-layer')
        .data(config?.enabled ? [undefined] : [])
        .join('div')
        .attr('class', 'kchart-tooltip-note-layer')
        .style('position', 'absolute')
        .style('inset', '0')
        .style('z-index', 7)
        .style('pointer-events', 'none');

    const cards = layer
        .selectAll<HTMLDivElement, KChartTooltipNote<T>>(
            'div.kchart-tooltip-note'
        )
        .data(notes, (note) => note.id)
        .join((enter) => {
            const card = enter
                .append('div')
                .attr('class', 'kchart-tooltip-note')
                .style('position', 'absolute')
                .style('width', '248px')
                .style('padding', '10px')
                .style('border', '1px solid var(--kchart-note-color)')
                .style('border-radius', '7px')
                .style('background', 'rgba(10, 14, 20, 0.96)')
                .style('box-shadow', '0 14px 32px rgba(0, 0, 0, 0.38)')
                .style('color', '#edf3f8')
                .style('font-size', '12px')
                .style('pointer-events', 'auto');
            const header = card
                .append('div')
                .attr('class', 'kchart-tooltip-note-header')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('justify-content', 'space-between')
                .style('gap', '8px')
                .style('margin-bottom', '7px');
            header
                .append('strong')
                .attr('class', 'kchart-tooltip-note-title')
                .style('color', 'var(--kchart-note-color)');
            header
                .append('button')
                .attr('class', 'kchart-tooltip-note-delete')
                .attr('type', 'button')
                .attr('aria-label', 'Delete pinned tooltip note')
                .attr('title', 'Delete note')
                .text('×')
                .style('width', '24px')
                .style('height', '24px')
                .style('padding', '0')
                .style('border', '1px solid rgba(248, 251, 255, 0.25)')
                .style('border-radius', '5px')
                .style('background', 'transparent')
                .style('color', '#f8fbff')
                .style('font-size', '17px')
                .style('line-height', '20px')
                .style('cursor', 'pointer');
            card
                .append('div')
                .attr('class', 'kchart-tooltip-note-content')
                .style('padding', '7px 8px')
                .style('border-radius', '5px')
                .style('background', 'rgba(255, 255, 255, 0.04)')
                .style('line-height', '1.45');
            card
                .append('textarea')
                .attr('class', 'kchart-tooltip-note-input')
                .attr('rows', 3)
                .style('display', 'block')
                .style('box-sizing', 'border-box')
                .style('width', '100%')
                .style('margin-top', '8px')
                .style('padding', '7px 8px')
                .style('resize', 'vertical')
                .style('border', '1px solid rgba(248, 251, 255, 0.2)')
                .style('border-radius', '5px')
                .style('outline', 'none')
                .style('background', 'rgba(0, 0, 0, 0.22)')
                .style('color', '#edf3f8')
                .style('font', 'inherit');
            return card;
        });

    cards
        .style('left', (note, index) => {
            const cardWidth = 248;
            const offset = index * 14;
            return `${Math.max(
                8,
                Math.min(
                    state.size.width - cardWidth - 8,
                    state.margin.left + note.x + 14 + offset
                )
            )}px`;
        })
        .style('top', (note, index) => {
            const cardHeight = 176;
            const offset = index * 12;
            return `${Math.max(
                8,
                Math.min(
                    state.size.height - cardHeight - 8,
                    state.margin.top + note.y + 14 + offset
                )
            )}px`;
        })
        .style('--kchart-note-color', (note) => note.color);

    cards
        .select<HTMLElement>('.kchart-tooltip-note-title')
        .text((note) => note.seriesName);
    cards
        .select<HTMLDivElement>('.kchart-tooltip-note-content')
        .html((note) => note.html);
    cards
        .select<HTMLTextAreaElement>('.kchart-tooltip-note-input')
        .attr('placeholder', config?.notePlaceholder ?? 'Add a note...')
        .property('value', (note) => note.note)
        .on('input', (event: Event, note) => {
            note.note = (event.currentTarget as HTMLTextAreaElement).value;
            notifyChange(state);
        });
    cards
        .select<HTMLButtonElement>('.kchart-tooltip-note-delete')
        .on('click', (event: MouseEvent, note) => {
            event.preventDefault();
            event.stopPropagation();
            const notes = getNotes(state);
            const index = notes.findIndex((item) => item.id === note.id);
            if (index >= 0) {
                notes.splice(index, 1);
                notifyChange(state);
                renderTooltipNotes(state);
            }
        });
};

export const destroyTooltipNotes = <T = any>(state: KChartState<T>): void => {
    state.container.selectAll('div.kchart-tooltip-note-layer').remove();
    notesByState.delete(state);
};
