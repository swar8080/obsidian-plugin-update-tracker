import { AnyAction, configureStore, ThunkAction } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import logger from 'redux-logger';
import ObsidianReducer from './obsidianReducer';
import ReleaseReducer from './releasesReducer';

export const store = configureStore({
    reducer: {
        obsidian: ObsidianReducer,
        releases: ReleaseReducer,
    },
    middleware: (getDefaultMiddleware) => {
        if (process.env.OBSIDIAN_APP_ENABLE_REDUX_LOGGER === 'true') {
            return getDefaultMiddleware().concat(logger);
        }
        return getDefaultMiddleware();
    },
});

export type State = ReturnType<typeof store.getState>;
type Dispatcher = typeof store.dispatch;

export const useAppDispatch: () => Dispatcher = useDispatch;
export const useAppSelector: TypedUseSelectorHook<State> = useSelector;

export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, State, unknown, AnyAction>;
