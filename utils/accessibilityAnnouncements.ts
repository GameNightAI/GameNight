// Global accessibility announcements for common app actions
export const accessibilityAnnouncements = {
  // Navigation
  screenChanged: (screenName: string) =>
    `Navigated to ${screenName} screen`,

  modalOpened: (modalName: string) =>
    `${modalName} dialog opened`,

  modalClosed: (modalName: string) =>
    `${modalName} dialog closed`,

  // Game Collection
  gameAdded: (gameName: string) =>
    `${gameName} added to your collection`,

  gameRemoved: (gameName: string) =>
    `${gameName} removed from your collection`,

  collectionSynced: (gameCount: number) =>
    `Collection synced successfully. ${gameCount} games imported`,

  collectionSyncFailed: () =>
    'Collection sync failed. Please try again',

  // Polls
  pollCreated: (pollTitle: string) =>
    `Poll "${pollTitle}" created successfully`,

  pollDeleted: (pollTitle: string) =>
    `Poll "${pollTitle}" deleted`,

  voteSubmitted: (gameName: string) =>
    `Vote submitted for ${gameName}`,

  voteRemoved: (gameName: string) =>
    `Vote removed for ${gameName}`,

  pollResultsUpdated: () =>
    'Poll results updated',

  // Events
  eventCreated: (eventTitle: string) =>
    `Event "${eventTitle}" created successfully`,

  eventDeleted: (eventTitle: string) =>
    `Event "${eventTitle}" deleted`,

  eventVoteSubmitted: (date: string) =>
    `Vote submitted for ${date}`,

  eventVoteRemoved: (date: string) =>
    `Vote removed for ${date}`,

  // Search
  searchStarted: (query: string) =>
    `Searching for "${query}"`,

  searchCompleted: (resultCount: number) =>
    `Search completed. ${resultCount} games found`,

  searchNoResults: () =>
    'No games found matching your search',

  // Filters
  filterApplied: (filterType: string) =>
    `${filterType} filter applied`,

  filterRemoved: (filterType: string) =>
    `${filterType} filter removed`,

  allFiltersCleared: () =>
    'All filters cleared',

  // Image Analysis
  imageAnalysisStarted: () =>
    'Analyzing image for board games',

  imageAnalysisCompleted: (gameCount: number) =>
    `Image analysis completed. ${gameCount} games detected`,

  imageAnalysisFailed: () =>
    'Image analysis failed. Please try again',

  // Form Actions
  formSubmitted: (formName: string) =>
    `${formName} submitted successfully`,

  formValidationError: (fieldName: string) =>
    `Please check ${fieldName} field`,

  formSaved: (formName: string) =>
    `${formName} saved successfully`,

  // Loading States
  loadingStarted: (action: string) =>
    `${action} in progress`,

  loadingCompleted: (action: string) =>
    `${action} completed successfully`,

  loadingFailed: (action: string) =>
    `${action} failed. Please try again`,

  // Error States
  networkError: () =>
    'Network error. Please check your connection',

  serverError: () =>
    'Server error. Please try again later',

  permissionDenied: (permission: string) =>
    `${permission} permission denied. Please enable in settings`,

  // Success States
  actionCompleted: (action: string) =>
    `${action} completed successfully`,

  dataRefreshed: () =>
    'Data refreshed successfully',

  settingsUpdated: () =>
    'Settings updated successfully',
};
