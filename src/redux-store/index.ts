// Third-party Imports
import { configureStore, createSlice } from '@reduxjs/toolkit'

// Dummy slice to satisfy Redux requirement
const dummySlice = createSlice({
  name: 'dummy',
  initialState: { value: 0 },
  reducers: {}
})

export const store = configureStore({
  reducer: {
    dummy: dummySlice.reducer
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware({ serializableCheck: false })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
