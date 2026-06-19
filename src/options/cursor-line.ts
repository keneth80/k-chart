import type {
    KChartCursorGuideConfiguration,
    KChartCursorLineOption,
    KChartState
} from '../core/contracts';

export const createCursorLineOption = (
    config: KChartCursorGuideConfiguration = {}
): KChartCursorLineOption => ({
    type: 'cursor-line',
    visible: config.visible ?? true,
    config
});

export const resolveCursorGuide = <T = any>(
    state: KChartState<T>
): KChartCursorGuideConfiguration | undefined => {
    const option = state.config.options?.find(
        (item): item is KChartCursorLineOption =>
            item.type === 'cursor-line' && item.visible !== false
    );
    if (option) {
        return {
            visible: option.visible ?? true,
            ...option.config
        };
    }

    return state.config.cursorGuide ?? state.config.guideLine;
};
