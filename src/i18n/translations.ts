export type SupportedLanguage = 'es' | 'en';

export interface TranslationDictionary {
  // Brand & General
  brandTitle: string;
  brandSubtitle: string;
  settings: string;
  settingsTitle: string;
  settingsSubtitle: string;
  displayMode: string;
  compactMode: string;
  compactModeShort: string;
  compactModeDesc: string;
  extendedMode: string;
  extendedModeShort: string;
  extendedModeDesc: string;
  appearance: string;
  lightMode: string;
  lightModeDesc: string;
  darkMode: string;
  darkModeDesc: string;
  language: string;
  languageDesc: string;
  languageNotice: string;
  spanish: string;
  english: string;
  active: string;
  defaultBadge: string;
  optionalBadge: string;
  aboutTeamSectionSetting: string;
  showExpanded: string;
  showExpandedSub: string;
  permanentlyMinimized: string;
  permanentlyMinimizedSub: string;
  done: string;
  close: string;
  cancel: string;
  save: string;
  reset: string;
  clear: string;
  edit: string;
  delete: string;
  search: string;
  searchPlaceholder: string;
  navSearchPlaceholder: string;
  bufferingSearch: string;
  clearSearch: string;
  
  // Navigation & Actions
  tradeCalc: string;
  tradeCalcShort: string;
  openTradeCalc: string;
  officialDiscord: string;
  staffPortal: string;
  staffLogin: string;
  staffLogout: string;
  staffAccess: string;
  termsOfService: string;
  backToCatalog: string;
  backToValueList: string;
  scrollToTop: string;
  loadMoreRemaining: string;
  loadingNextItems: string;
  scrollOrClickLoadMore: string;
  lastUpdated: string;
  liveMarketTicker: string;
  
  // Categories
  catAll: string;
  catAir: string;
  catLand: string;
  catNaval: string;
  catSoldier: string;
  catDrone: string;
  catTags: string;
  catOther: string;
  allItemsCount: string;
  categoryItemsCount: string;
  
  // Rarities
  rarityLimitedEdition: string;
  rarityExotic: string;
  rarityLegendary: string;
  rarityEpic: string;
  rarityRare: string;
  rarityCommon: string;
  rarityLabel: string;
  clearRarityFilter: string;
  
  // Trends
  trendAll: string;
  trendGlazed: string;
  trendRising: string;
  trendStable: string;
  trendDropping: string;
  trendUnstable: string;
  marketTrend: string;
  
  // Sorting
  sortBy: string;
  sortHighestValue: string;
  sortLowestValue: string;
  sortHighestDemand: string;
  sortLowestDemand: string;
  sortAlphabetical: string;
  sortRecentlyUpdated: string;
  sortBiggestGain: string;
  highestValue?: string;
  lowestValue?: string;
  highestDemand?: string;
  lowestDemand?: string;
  nameAsc?: string;
  recentlyUpdated?: string;
  viewReelList?: string;
  activeReelItems?: string;
  
  // Demand & Stats
  demand: string;
  minDemand: string;
  demandAny: string;
  demandMax: string;
  demandVeryHigh: string;
  demandHigh: string;
  demandModerate: string;
  demandLow: string;
  demandVeryLow: string;
  
  // Item Card & Details
  value: string;
  starTier: string;
  starBonus: string;
  rankMultiplier: string;
  gemRange: string;
  tradeable: string;
  untradeable: string;
  override: string;
  inspectDetails: string;
  full: string;
  fullPage: string;
  quickEdit: string;
  suggest: string;
  expandCard: string;
  collapseCard: string;
  viewNotes: string;
  hideNotes: string;
  itemNotes: string;
  noNotes: string;
  base: string;
  total: string;
  multiplier: string;
  freshStock: string;
  
  // Item Detail Page
  marketStats: string;
  priceHistory: string;
  inGameDetails: string;
  inGameCost: string;
  speed: string;
  damage: string;
  health: string;
  obtainableFrom: string;
  starVariations: string;
  starVariationsDesc: string;
  addToTradeCalc: string;
  suggestCorrection: string;
  changeHistory: string;
  shareItem: string;
  linkCopied: string;
  copyLink: string;
  printPage: string;
  days30: string;
  days90: string;
  allTime: string;
  recordedDataPoints: string;
  priceHistoryStableNotice: string;
  recentAuditHistory: string;
  untradeableBadge: string;
  setTradeable: string;
  setUntradeable: string;
  tradeCalcBtn: string;
  staffEditBtn: string;
  verifiedIndex: string;
  selectUpgradeTier: string;
  selectRankMultiplier: string;
  activeLabel: string;
  trendAndMomentum: string;
  totalShift: string;
  demandScore: string;
  descriptionNotes: string;
  editDescription: string;
  addDescription: string;
  saveDescription: string;
  descriptionSavedSuccess: string;
  noDescriptionNotes: string;
  autoTranslated: string;
  viewOriginal: string;
  viewTranslation: string;
  translating: string;
  autoTranslateEnabled: string;
  autoTranslatedByAI: string;
  historicalTrajectory: string;
  comparativeMultiStarCurves: string;
  activeStarTracking: string;
  selectedTierBtn: string;
  starValuationBreakdown: string;
  communitySuggestionTitle: string;
  communitySuggestionSubtitle: string;
  suggestionSubmittedAudit: string;
  suggestionAuditThanks: string;
  submitAnotherSuggestion: string;
  targetStarTier: string;
  yourRobloxUsername: string;
  discordTagOptional: string;
  evidenceProofUrl: string;
  reasonMarketJustification: string;
  reasonMarketPlaceholder: string;
  verifiedModificationAuditHistory: string;
  staffOnly: string;
  chronologicalLogAudits: string;
  noRecentAuditLogs: string;
  tableTimestamp: string;
  tableAction: string;
  tableValuationShift: string;
  tableDetailsReason: string;
  tableAuditor: string;
  offerBtn: string;
  receiveBtn: string;
  enterCombatNotesPlaceholder: string;
  
  // Empty states
  noItemsFound: string;
  noItemsFoundDesc: string;
  catalogReady: string;
  catalogReadyDesc: string;
  addItemStaff: string;
  filters: string;
  resetAll: string;
  
  // Trade Calculator
  tradeCalculatorTitle: string;
  tradeCalculatorSubtitle: string;
  youGive: string;
  theyGive: string;
  you: string;
  them: string;
  addItems: string;
  addItem: string;
  clearTrade: string;
  swapSides: string;
  balanceWithGems: string;
  fairTrade: string;
  bigWin: string;
  win: string;
  lose: string;
  bigLose: string;
  emptyTrade: string;
  emptyTradeDesc: string;
  emptyTradePoints: string;
  taxAppliedNotice: string;
  customGems: string;
  addGems: string;
  enterGems: string;
  searchItemsPlaceholder: string;
  noItemsInPicker: string;
  quantity: string;
  starsTotal: string;
  netValue: string;
  difference: string;
  averageDemand: string;
  copySummary: string;
  saveTrade: string;
  savedTrades: string;
  tradeAdvice: string;
  riskSafe: string;
  riskCaution: string;
  riskWarning: string;
  riskNeutral: string;
  selectTier: string;
  
  // Report Modal
  reportModalTitle: string;
  reportModalSubtitle: string;
  suggestValueUpdate: string;
  suggestedValueGems: string;
  suggestedValueLabel: string;
  suggestedDemand110: string;
  suggestedDemandLabel: string;
  suggestedTrend: string;
  priceTrendLabel: string;
  reasonOrProof: string;
  reasonPlaceholder: string;
  evidencePlaceholder: string;
  discordUsernameLabel: string;
  discordUsernamePlaceholder: string;
  proofLinkLabel: string;
  captchaRequiredError: string;
  submitReport: string;
  submitSuggestion: string;
  verifyToSubmit: string;
  submitting: string;
  reportSuccess: string;
  reportSuccessDesc: string;
  suggestionSubmitted: string;
  suggestionLoggedNotice: string;
  enterValuationPlaceholder: string;
  
  // Price Chart Modal
  chartModalTitle: string;
  chartModalSubtitle: string;
  currentValue: string;
  currentTrend: string;
  priceTrackingSubtitle: string;
  allTimePeak: string;
  netGainLoss: string;
  trajectoryGraph: string;
  displayingAllCurves: string;
  displayingBaselineCurve: string;
  baseLineBtn: string;
  allStarValuesBtn: string;
  starMatrixBreakdown: string;
  addAuditPointStaff: string;
  addPriceHistoryPointTitle: string;
  newValueLabel: string;
  dateLabel: string;
  transactionNoteLabel: string;
  commitPoint: string;
  managePointsStaff: string;
  removePoint: string;
  confirmRemovePoint: string;
  addToRecentlyUpdated: string;
  removeFromRecentlyUpdated: string;
  noPointsRecorded: string;
  
  // Info & Team Section
  aboutMtsTitle: string;
  aboutMtsSubtitle: string;
  ourMission: string;
  ourMissionDesc: string;
  ourTeam: string;
  ourTeamDesc: string;
  roleAdmin: string;
  roleStaff: string;
  roleAnalyst: string;
  roleFounder: string;
  roleDeveloper: string;
  
  // Footer & Quota Banner
  footerDesc: string;
  footerRights: string;
  quotaBannerTitle: string;
  quotaBannerDesc: string;
  dismissBanner: string;

  // Extended Trade Calculator
  gemTaxNotice: string;
  gemTaxRateNotice: string;
  flipSides: string;
  copyPost: string;
  history: string;
  saveCurrent: string;
  noSavedTrades: string;
  starsDelta: string;
  demandDelta: string;
  withinFairValue: string;
  imbalance: string;
  autoBalanceTrade: string;
  yourOfferYouGive: string;
  yourTotalGiven: string;
  addItemToYourSide: string;
  addItemToTheirSide: string;
  noItemsOfferedYet: string;
  noItemsOffered: string;
  noItemsOfferedDesc: string;
  addItemsToCalc: string;
  addFirstItem: string;
  yourGemsOffered: string;
  clearGems: string;
  gemsSentByYou: string;
  taxDeducted: string;
  recipientReceivesNet: string;
  theirOfferYouReceive: string;
  netValueReceived: string;
  theirGemsOffered: string;
  gemsSentByThem: string;
  youReceiveNet: string;
  totalUnitsTraded: string;
  enterGemsPlaceholder: string;
  multiAddMode: string;
  searchVehiclesPlaceholder: string;
  pickerSubtitle: string;
  noMatchingVehicles: string;
  inTrade: string;
  loadMoreVehicles: string;
  clearTradeTitle: string;
  clearTradeDesc: string;
  clearAll: string;

  // Item Detail Page & Extended
  catalog: string;
  share: string;
  staffEdit: string;
  gemsLabel: string;
  staffOverride: string;
  liveStatus: string;
  compareInTradeCalc: string;
  starTierValuation: string;
  baseItemValue: string;
  demandRating: string;
  marketTrendLabel: string;
  tradeStatusLabel: string;
  tradeableStandard: string;
  untradeableLocked: string;
  priceTrendHistory: string;
  reportSuggestUpdate: string;
  changeAuditLog: string;
  timeframe7d: string;
  timeframe30d: string;
  timeframe90d: string;
  timeframeAll: string;
  allTiers: string;
  selectedTierOnly: string;

  // Item Edit Modal
  editItemTitle: string;
  saveChanges: string;
  deleteItem: string;
  itemNameLabel: string;
  acronymLabel: string;
  searchKey: string;
  thumbnailLabel: string;
  pasteImage: string;
  uploadLocal: string;
  categoryLabel: string;
  tradeStatus: string;
  baseItemValuation: string;
  baseValueLabel: string;
  baseDemandLabel: string;
  baseTrendLabel: string;
  manualStarOverrides: string;
  manualGemRange: string;
  itemNotesLabel: string;
  auditReasonLabel: string;
  lastUpdatedLabel: string;
  resetGraph: string;
  deleteConfirmTitle: string;
  deleteConfirmDesc: string;
  yesDelete: string;
  copyToAllTiers: string;
  reFillUniversal: string;

  // App & General UI
  valueList: string;
  allItems: string;
  items: string;
  staffModeActive: string;
  noMatchingItems: string;
  noMatchingDesc: string;
  addItemViaStaff: string;
  loadMore: string;
  remaining: string;
  staffAuth: string;
  tos: string;
  awaitingUpdates: string;
  aboutMilitaryTycoonServices: string;
  aboutMtsAndTeam: string;
  staffMembers: string;
  itemsCount: string;
  joinOfficialDiscord: string;
  adminEdit: string;
  expand: string;
  minimize: string;
  noTeamMembers: string;
  catalogStat: string;
  totalValueStat: string;
  firestoreQuotaTitle: string;
  firestoreQuotaDesc: string;
  enableBillingUpgrade: string;

  // Additional keys for UI polish & trade calculator
  switchToCompact?: string;
  switchToExpanded?: string;
  compact?: string;
  expandFilters?: string;
  collapseFilters?: string;
  rarity?: string;
  all?: string;
  trend?: string;
  allTrends?: string;
  fresh?: string;
  rankStar?: string;
  collapse?: string;
  recent?: string;
  today?: string;
  justNow?: string;
  ago?: string;
  yesterday?: string;
  moveToTheirOffer?: string;
  moveToYourOffer?: string;
  remove?: string;
  stars?: string;
  gems?: string;
  theirOfferTheyGive?: string;
  theirTotalReceived?: string;
  gemTaxRate?: string;
  addItemTo?: string;
  yourSide?: string;
  theirSide?: string;
  of?: string;
  pickerDesc?: string;
  searchVehiclePlaceholder?: string;
  sortValueHigh?: string;
  sortValueLow?: string;
  sortNameAZ?: string;
  showing?: string;
  clearTradePrompt?: string;
  clearTradeWarning?: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = {
  es: {
    // Brand & General
    brandTitle: 'MILITARY TYCOON SERVICES',
    brandSubtitle: 'Lista de valores oficial de la comunidad para Military Tycoon',
    settings: 'Configuración',
    settingsTitle: 'Configuración del Sistema',
    settingsSubtitle: 'Personaliza tu experiencia visual, modo de tarjetas e idioma',
    displayMode: 'Modo de visualización',
    compactMode: 'Modo Compacto',
    compactModeShort: 'Compacto',
    compactModeDesc: 'Muestra tarjetas condensadas y eficientes para ver más objetos a la vez.',
    extendedMode: 'Modo extendido',
    extendedModeShort: 'Extendido',
    extendedModeDesc: 'Muestra tarjetas completas con imágenes amplias, barras de demanda y estadísticas.',
    appearance: 'Tema y Apariencia',
    lightMode: 'Modo claro',
    lightModeDesc: 'Diseño brillante y cálido con excelente visibilidad para el día.',
    darkMode: 'Modo oscuro',
    darkModeDesc: 'Diseño oscuro de alto contraste que reduce el cansancio visual.',
    language: 'Idioma del sitio',
    languageDesc: 'Selecciona el idioma de la interfaz. Los nombres de objetos y nombres propios permanecen en su versión original.',
    languageNotice: 'Los nombres de vehículos, armas y miembros del personal se mantienen intactos.',
    spanish: 'Español',
    english: 'English (Inglés)',
    active: 'Activo',
    defaultBadge: 'Predeterminado',
    optionalBadge: 'Opcional',
    aboutTeamSectionSetting: 'Sección Acerca de y Equipo',
    showExpanded: 'Mostrar expandido',
    showExpandedSub: 'Vista estándar desplegada',
    permanentlyMinimized: 'Minimizar permanentemente',
    permanentlyMinimizedSub: 'Barra compacta colapsada',
    done: 'Listo',
    close: 'Cerrar',
    cancel: 'Cancelar',
    save: 'Guardar',
    reset: 'Restablecer',
    clear: 'Limpiar',
    edit: 'Editar',
    delete: 'Eliminar',
    search: 'Buscar',
    searchPlaceholder: 'Buscar objetos por armas, estadísticas o notas...',
    navSearchPlaceholder: 'Buscar objetos, vehículos, armas...',
    bufferingSearch: 'Filtrando búsqueda...',
    clearSearch: 'Borrar búsqueda',
    
    // Navigation & Actions
    tradeCalc: 'Calc. de Intercambio',
    tradeCalcShort: 'Calc',
    openTradeCalc: 'Abrir Calculadora de Intercambios',
    officialDiscord: 'Servidor oficial de Discord',
    staffPortal: 'Portal del Personal',
    staffLogin: 'Iniciar sesión como personal',
    staffLogout: 'Cerrar sesión de personal',
    staffAccess: 'Acceso del Personal',
    termsOfService: 'Términos de Servicio',
    backToCatalog: 'Volver al catálogo',
    backToValueList: 'Volver a la lista de valores',
    scrollToTop: 'Subir al inicio',
    loadMoreRemaining: 'restantes',
    loadingNextItems: 'Cargando siguientes objetos al desplazarse...',
    scrollOrClickLoadMore: 'Desplázate o haz clic para cargar más',
    lastUpdated: 'Última actualización',
    liveMarketTicker: 'Mercado en vivo',
    
    // Categories
    catAll: 'Todos los objetos',
    catAir: 'Aéreo',
    catLand: 'Terrestre',
    catNaval: 'Naval',
    catSoldier: 'Soldados',
    catDrone: 'Drones',
    catTags: 'Etiquetas',
    catOther: 'Otros',
    allItemsCount: 'Todos los objetos',
    categoryItemsCount: 'Objetos',
    
    // Rarities
    rarityLimitedEdition: 'Edición Limitada',
    rarityExotic: 'Exótico',
    rarityLegendary: 'Legendario',
    rarityEpic: 'Épico',
    rarityRare: 'Raro',
    rarityCommon: 'Común',
    rarityLabel: 'Rareza:',
    clearRarityFilter: 'Limpiar',
    
    // Trends
    trendAll: 'Todas las tendencias',
    trendGlazed: 'Gran demanda',
    trendRising: 'Subiendo ↗',
    trendStable: 'Estable ═',
    trendDropping: 'Bajando ↘',
    trendUnstable: 'Inestable',
    marketTrend: 'Tendencia de mercado',
    
    // Sorting
    sortBy: 'Ordenar por:',
    sortHighestValue: 'Mayor valor',
    sortLowestValue: 'Menor valor',
    sortHighestDemand: 'Mayor demanda',
    sortLowestDemand: 'Menor demanda',
    sortAlphabetical: 'Alfabético (A-Z)',
    sortRecentlyUpdated: 'Actualizado recientemente',
    sortBiggestGain: 'Mayor aumento',
    highestValue: 'Mayor valor',
    lowestValue: 'Menor valor',
    highestDemand: 'Mayor demanda',
    lowestDemand: 'Menor demanda',
    nameAsc: 'Alfabético (A-Z)',
    recentlyUpdated: 'Actualizado recientemente',
    viewReelList: 'Ver lista',
    activeReelItems: 'Elementos en actualización reciente',
    
    // Demand & Stats
    demand: 'Demanda',
    minDemand: 'Demanda mínima',
    demandAny: 'Todas',
    demandMax: 'Demanda máxima',
    demandVeryHigh: 'Muy alta',
    demandHigh: 'Alta demanda',
    demandModerate: 'Moderada',
    demandLow: 'Baja demanda',
    demandVeryLow: 'Muy baja',
    
    // Item Card & Details
    value: 'VALOR',
    starTier: 'Nivel de estrellas',
    starBonus: 'Bono de estrellas',
    rankMultiplier: 'Multiplicador de rango/estrellas',
    gemRange: 'Rango de gemas:',
    tradeable: 'INTERCAMBIABLE',
    untradeable: 'NO INTERCAMBIABLE',
    override: 'Personalizado',
    inspectDetails: 'Inspeccionar página de detalles',
    full: 'Completo',
    fullPage: 'Página completa',
    quickEdit: 'Edición rápida',
    suggest: 'Sugerir',
    expandCard: 'Expandir tarjeta',
    collapseCard: 'Plegar a vista compacta',
    viewNotes: 'Ver notas del objeto',
    hideNotes: 'Ocultar notas del objeto',
    itemNotes: 'Notas del objeto',
    noNotes: 'Sin notas registradas para este objeto.',
    base: 'Base',
    total: 'Total',
    multiplier: 'multiplicador',
    freshStock: 'Original',
    
    // Item Detail Page
    marketStats: 'Estadísticas de mercado',
    priceHistory: 'Historial de precios',
    inGameDetails: 'Detalles en el juego',
    inGameCost: 'Costo en el juego',
    speed: 'Velocidad',
    damage: 'Daño',
    health: 'Salud',
    obtainableFrom: 'Obtenible en',
    starVariations: 'Variaciones de estrellas y multiplicadores',
    starVariationsDesc: 'Consulta los valores calculados según el nivel de mejora de estrellas.',
    addToTradeCalc: 'Agregar a calculadora de intercambios',
    suggestCorrection: 'Sugerir corrección de valor',
    changeHistory: 'Historial de auditoría',
    shareItem: 'Compartir objeto',
    linkCopied: '¡Enlace copiado!',
    copyLink: 'Copiar enlace',
    printPage: 'Imprimir',
    days30: '30 días',
    days90: '90 días',
    allTime: 'Todo el tiempo',
    recordedDataPoints: 'Puntos de datos registrados',
    priceHistoryStableNotice: 'Este objeto se ha mantenido estable en su valor base.',
    recentAuditHistory: 'Historial de cambios recientes',
    untradeableBadge: 'ININTERCAMBIABLE',
    setTradeable: 'Hacer intercambiable',
    setUntradeable: 'Hacer inintercambiable',
    tradeCalcBtn: 'Calc. comercio',
    staffEditBtn: 'Editar personal',
    verifiedIndex: 'Índice de valoración de mercado verificado',
    selectUpgradeTier: 'Seleccionar nivel de mejora:',
    selectRankMultiplier: 'Seleccionar rango / multiplicador:',
    activeLabel: 'Activo',
    trendAndMomentum: 'Tendencia e impulso',
    totalShift: 'Cambio total',
    demandScore: 'Demanda',
    descriptionNotes: 'Descripción / Notas',
    editDescription: 'Editar descripción',
    addDescription: '+ Agregar descripción',
    saveDescription: 'Guardar descripción',
    descriptionSavedSuccess: '¡Descripción guardada con éxito!',
    noDescriptionNotes: 'Aún no se han añadido notas ni descripción para este objeto. El personal puede hacer clic en "+ Agregar descripción" arriba para añadir una.',
    autoTranslated: 'Traducido automáticamente',
    viewOriginal: 'Ver original',
    viewTranslation: 'Ver traducción',
    translating: 'Traduciendo...',
    autoTranslateEnabled: 'Traducción automática activa',
    autoTranslatedByAI: 'Traducido automáticamente',
    historicalTrajectory: 'Gráfico',
    comparativeMultiStarCurves: 'Curvas comparativas de valoración por estrellas a lo largo del tiempo',
    activeStarTracking: 'Seguimiento de valoración de estrella activa',
    selectedTierBtn: 'Nivel seleccionado',
    starValuationBreakdown: 'Desglose de valoración por estrella:',
    communitySuggestionTitle: 'Sugerencia de valor de la comunidad y pruebas de intercambio',
    communitySuggestionSubtitle: 'Propón ajustes verificados con registros de intercambio, capturas de pantalla u observaciones de mercado',
    suggestionSubmittedAudit: '¡Sugerencia enviada para revisión de auditoría!',
    suggestionAuditThanks: 'Gracias por colaborar con el índice de Military Tycoon Services. Nuestro equipo de moderación auditará las pruebas presentadas.',
    submitAnotherSuggestion: 'Enviar otra sugerencia',
    targetStarTier: 'Nivel de estrella objetivo',
    yourRobloxUsername: 'Tu nombre de usuario de Roblox',
    discordTagOptional: 'Etiqueta de Discord / Usuario (Opcional)',
    evidenceProofUrl: 'URL de prueba / enlace a captura',
    reasonMarketJustification: 'Motivo y justificación de mercado',
    reasonMarketPlaceholder: 'Describe intercambios recientes, cambios en la demanda o fluctuaciones del mercado en el juego...',
    verifiedModificationAuditHistory: 'Historial de auditoría de modificaciones verificadas',
    staffOnly: 'Solo personal',
    chronologicalLogAudits: 'Registro cronológico de auditorías de personal verificadas y actualizaciones de valor',
    noRecentAuditLogs: 'No hay registros recientes de auditorías manuales para este objeto. El valor actual refleja la referencia inicial.',
    tableTimestamp: 'Fecha y hora',
    tableAction: 'Acción',
    tableValuationShift: 'Cambio de valoración',
    tableDetailsReason: 'Detalles / Motivo',
    tableAuditor: 'Auditor',
    offerBtn: '+ Ofertar',
    receiveBtn: '+ Recibir',
    enterCombatNotesPlaceholder: 'Ingresa notas del meta de combate, historia o análisis de intercambio...',
    
    // Empty states
    noItemsFound: 'No se encontraron objetos',
    noItemsFoundDesc: 'No hay objetos que coincidan con los filtros aplicados. Ajusta tu búsqueda o restablece los filtros.',
    catalogReady: 'Catálogo listo para objetos',
    catalogReadyDesc: 'La lista de objetos está vacía. Usa el portal de personal para agregar y verificar objetos.',
    addItemStaff: 'Agregar objeto desde portal',
    filters: 'Filtros',
    resetAll: 'Restablecer todo',
    
    // Trade Calculator
    tradeCalculatorTitle: 'Calculadora de Intercambios',
    tradeCalculatorSubtitle: 'Compara ofertas, calcula impuestos sobre gemas y evalúa el balance de valor.',
    youGive: 'Tú ofreces',
    theyGive: 'Ellos ofrecen',
    you: 'Tú',
    them: 'Ellos',
    addItems: 'Agregar objetos',
    addItem: 'Agregar objeto',
    clearTrade: 'Limpiar intercambio',
    swapSides: 'Intercambiar lados',
    balanceWithGems: 'Equilibrar con gemas',
    fairTrade: 'Intercambio justo',
    bigWin: 'Gran ganancia',
    win: 'Ganancia',
    lose: 'Pérdida',
    bigLose: 'Gran pérdida',
    emptyTrade: 'Intercambio vacío',
    emptyTradeDesc: 'Agrega objetos o gemas a ambos lados para evaluar si el intercambio es favorable o desfavorable.',
    emptyTradePoints: 'Elige objetos del catálogo o añade gemas con deducción de impuestos del 8%.',
    taxAppliedNotice: 'Impuesto de gemas del 8% aplicado a las gemas recibidas.',
    customGems: 'Gemas personalizadas',
    addGems: 'Agregar gemas',
    enterGems: 'Ingresar cantidad de gemas...',
    searchItemsPlaceholder: 'Buscar objetos para agregar...',
    noItemsInPicker: 'No se encontraron objetos en el catálogo.',
    quantity: 'Cantidad',
    starsTotal: 'Estrellas totales',
    netValue: 'Valor neto',
    difference: 'Diferencia',
    averageDemand: 'Demanda promedio',
    copySummary: 'Copiar resumen',
    saveTrade: 'Guardar intercambio',
    savedTrades: 'Intercambios guardados',
    tradeAdvice: 'Consejo de intercambio',
    riskSafe: 'Favorable',
    riskCaution: 'Precaución',
    riskWarning: 'Desfavorable',
    riskNeutral: 'Neutral',
    selectTier: 'Seleccionar estrella',
    
    // Report Modal
    reportModalTitle: 'Reportar valor de objeto',
    reportModalSubtitle: 'Ayuda a mantener los valores precisos y actualizados para la comunidad.',
    suggestValueUpdate: 'Sugerir actualización de valor',
    suggestedValueGems: 'Valor sugerido en gemas',
    suggestedValueLabel: 'Valor sugerido:',
    suggestedDemand110: 'Demanda estimada (1-10)',
    suggestedDemandLabel: 'Demanda sugerida:',
    suggestedTrend: 'Tendencia estimada',
    priceTrendLabel: 'Tendencia de precio:',
    reasonOrProof: 'Motivo o enlace de prueba',
    reasonPlaceholder: 'Describe por qué el valor debería actualizarse o incluye capturas/pruebas de intercambios...',
    evidencePlaceholder: 'Enlace de Discord, captura o video (opcional)',
    discordUsernameLabel: 'Nombre de usuario de Discord / Comerciante (Opcional)',
    discordUsernamePlaceholder: 'ej. TraderAlex o Discord#1234',
    proofLinkLabel: 'Enlace de prueba / captura de pantalla (Opcional)',
    captchaRequiredError: 'Se requiere la verificación humana de Cloudflare. Por favor, marca la casilla superior.',
    submitReport: 'Enviar reporte',
    submitSuggestion: 'Enviar sugerencia',
    verifyToSubmit: 'Verificar para enviar',
    submitting: 'Enviando...',
    reportSuccess: '¡Reporte enviado con éxito!',
    reportSuccessDesc: 'Gracias por colaborar con la comunidad. Nuestro equipo revisará la sugerencia.',
    suggestionSubmitted: '¡Sugerencia enviada!',
    suggestionLoggedNotice: '¡Gracias! Tu valoración propuesta ha sido registrada.',
    enterValuationPlaceholder: 'Ingresa la valoración (ej. 50000 para $50K)',
    
    // Price Chart Modal
    chartModalTitle: 'Historial de valor en el mercado',
    chartModalSubtitle: 'Seguimiento de valor y evolución en los últimos 30 días.',
    currentValue: 'Valor actual',
    currentTrend: 'Tendencia actual',
    priceTrackingSubtitle: 'Seguimiento de precios y analítica de valoración por estrellas',
    allTimePeak: 'Pico histórico',
    netGainLoss: 'Ganancia / Pérdida neta',
    trajectoryGraph: 'Gráfico',
    displayingAllCurves: 'Mostrando curvas de todos los niveles de estrellas',
    displayingBaselineCurve: 'Mostrando curva de línea base principal',
    baseLineBtn: 'Línea base',
    allStarValuesBtn: 'Valores de estrellas',
    starMatrixBreakdown: 'Matriz de desglose de valores por estrella:',
    addAuditPointStaff: '+ Agregar punto de auditoría verificado (Personal)',
    addPriceHistoryPointTitle: 'Agregar punto al historial de precios',
    newValueLabel: 'Nuevo valor ($)',
    dateLabel: 'Etiqueta de fecha',
    transactionNoteLabel: 'Nota de transacción',
    commitPoint: 'Guardar punto',
    managePointsStaff: 'Gestionar puntos del gráfico (Personal)',
    removePoint: 'Eliminar punto',
    confirmRemovePoint: '¿Eliminar este punto?',
    addToRecentlyUpdated: 'Agregar a Actualizado Recientemente',
    removeFromRecentlyUpdated: 'Quitar de Actualizado Recientemente',
    noPointsRecorded: 'No hay puntos registrados aún',
    
    // Info & Team Section
    aboutMtsTitle: 'Acerca de Military Tycoon Services',
    aboutMtsSubtitle: 'Guía de valoración verificada y transparente para Roblox',
    ourMission: 'Nuestra misión',
    ourMissionDesc: 'Proporcionar la lista de valores más precisa, justa y actualizada para Military Tycoon en Roblox. Monitoreamos constantemente transacciones reales y opiniones comunitarias para mantener la economía del juego balanceada.',
    ourTeam: 'Nuestro equipo',
    ourTeamDesc: 'Conoce al equipo dedicado que audita, verifica y mantiene actualizada la lista de valores.',
    roleAdmin: 'Administrador',
    roleStaff: 'Personal',
    roleAnalyst: 'Analista',
    roleFounder: 'Fundador',
    roleDeveloper: 'Desarrollador',
    
    // Footer & Quota Banner
    footerDesc: 'Guía de valores no oficial creada por MTS para Military Tycoon en Roblox.',
    footerRights: 'Todos los recursos del juego y marcas comerciales pertenecen a sus respectivos dueños.',
    quotaBannerTitle: 'Modo de catálogo local activo',
    quotaBannerDesc: 'La base de datos se encuentra temporalmente en modo de lectura en caché. Puedes explorar todos los objetos con normalidad.',
    dismissBanner: 'Entendido',

    // Extended Trade Calculator keys
    gemTaxNotice: 'IMPUESTO DEL 8% AUTOMÁTICO',
    gemTaxRateNotice: 'Tasa de impuesto: 8% en gemas',
    flipSides: 'Invertir lados',
    copyPost: 'Copiar publicación',
    history: 'Historial',
    saveCurrent: 'Guardar actual',
    noSavedTrades: 'Aún no hay intercambios guardados. ¡Agrega objetos y haz clic en "Guardar actual" para guardar ofertas!',
    starsDelta: 'Diferencia de estrellas',
    demandDelta: 'Diferencia de demanda',
    withinFairValue: 'Dentro del valor justo (±5%)',
    imbalance: 'Desbalance',
    autoBalanceTrade: 'Equilibrar intercambio con gemas',
    yourOfferYouGive: 'TU OFERTA (TÚ ENTREGAS)',
    yourTotalGiven: 'Tu total entregado',
    addItemToYourSide: 'Agregar objeto a tu oferta',
    addItemToTheirSide: 'Agregar objeto a su oferta',
    noItemsOfferedYet: 'Aún no se han ofrecido objetos',
    noItemsOffered: 'No hay objetos ofrecidos',
    noItemsOfferedDesc: 'Agrega vehículos, armas o equipamiento para calcular este lado del intercambio.',
    addItemsToCalc: 'Agrega vehículos, soldados o drones para calcular los valores de intercambio.',
    addFirstItem: 'Agregar primer objeto',
    yourGemsOffered: 'Tus gemas ofrecidas',
    clearGems: 'Borrar gemas',
    gemsSentByYou: 'Gemas enviadas por ti:',
    taxDeducted: 'Impuesto del 8% deducido:',
    recipientReceivesNet: 'El destinatario recibe neto:',
    theirOfferYouReceive: 'SU OFERTA (TÚ RECIBES)',
    netValueReceived: 'Valor neto recibido',
    theirGemsOffered: 'Sus gemas ofrecidas',
    gemsSentByThem: 'Gemas enviadas por ellos:',
    youReceiveNet: 'Recibes neto (calculado en el intercambio):',
    totalUnitsTraded: 'Unidades totales intercambiadas:',
    enterGemsPlaceholder: 'Ingresa gemas (ej. 10m, 500k, 1000000)',
    multiAddMode: 'Modo múltiple',
    searchVehiclesPlaceholder: 'Buscar por nombre de vehículo, acrónimo (ej. AC-130, F-22, M1A2)...',
    pickerSubtitle: 'Toca un vehículo o selecciona una estrella directamente para agregarlo a la oferta.',
    noMatchingVehicles: 'No se encontraron vehículos coincidentes. Intenta ajustar el término de búsqueda o los filtros.',
    inTrade: 'en el intercambio',
    loadMoreVehicles: 'Cargar 10 vehículos más',
    clearTradeTitle: '¿Limpiar la calculadora de intercambios?',
    clearTradeDesc: 'Esto eliminará todos los objetos y gemas de ambos lados del intercambio.',
    clearAll: 'Limpiar todo',

    // Item Detail Page keys
    catalog: 'Catálogo',
    share: 'Compartir',
    staffEdit: 'Editar (Personal)',
    gemsLabel: 'Gemas:',
    staffOverride: 'Anulación de personal',
    liveStatus: 'En vivo',
    compareInTradeCalc: 'Comparar en calculadora de intercambios',
    starTierValuation: 'Valoración por estrellas:',
    baseItemValue: 'Valor base del objeto',
    demandRating: 'Calificación de demanda',
    marketTrendLabel: 'Tendencia de mercado',
    tradeStatusLabel: 'Estado de intercambio',
    tradeableStandard: 'Intercambiable (Estándar)',
    untradeableLocked: 'No intercambiable 🔒',
    priceTrendHistory: 'Tendencia de precios y valor histórico',
    reportSuggestUpdate: 'Reportar / Sugerir actualización de precio',
    changeAuditLog: 'Registro de cambios y auditoría',
    timeframe7d: '7 Días',
    timeframe30d: '30 Días',
    timeframe90d: '90 Días',
    timeframeAll: 'Todo',
    allTiers: 'Todas las estrellas',
    selectedTierOnly: 'Estrella seleccionada',

    // Item Edit Modal keys
    editItemTitle: 'Editar objeto',
    saveChanges: 'Guardar cambios',
    deleteItem: 'Eliminar objeto',
    itemNameLabel: 'Nombre del objeto:',
    acronymLabel: 'Acrónimo (Opc):',
    searchKey: 'Clave de búsqueda',
    thumbnailLabel: 'Imagen / Miniatura del objeto:',
    pasteImage: 'Pegar imagen',
    uploadLocal: 'Subir archivo local',
    categoryLabel: 'Categoría:',
    tradeStatus: 'Estado de intercambio:',
    baseItemValuation: 'Valoración base del objeto:',
    baseValueLabel: 'Valor base ($ / 💎):',
    baseDemandLabel: 'Demanda base (1–10):',
    baseTrendLabel: 'Tendencia base:',
    manualStarOverrides: 'Anulaciones manuales de estrellas',
    manualGemRange: 'Anulación manual del rango de gemas',
    itemNotesLabel: 'Notas / Descripción del objeto:',
    auditReasonLabel: 'Motivo de auditoría (Registro de moderación):',
    lastUpdatedLabel: 'Marca de tiempo de última actualización:',
    resetGraph: 'Restablecer gráfico a línea base limpia',
    deleteConfirmTitle: '¿Eliminar objeto?',
    deleteConfirmDesc: 'Esta acción no se puede deshacer.',
    yesDelete: 'Sí, eliminar',
    copyToAllTiers: 'Copiar a todas',
    reFillUniversal: 'Rellenar todo desde universal',

    // App & General UI
    valueList: 'Lista de Valores',
    allItems: 'Todos los objetos',
    items: 'Objetos',
    staffModeActive: 'Modo personal activo',
    noMatchingItems: 'No se encontraron objetos',
    noMatchingDesc: 'No hay objetos que coincidan con los filtros aplicados. Intenta ajustar el término de búsqueda o la configuración de rareza.',
    addItemViaStaff: 'Agregar objeto mediante portal de personal',
    loadMore: 'Cargar más',
    remaining: 'restantes',
    staffAuth: 'Autenticación de personal',
    tos: 'Términos de Servicio',
    awaitingUpdates: 'Esperando actualizaciones',
    aboutMilitaryTycoonServices: 'Acerca de Military Tycoon Services',
    aboutMtsAndTeam: 'Acerca de Military Tycoon Services y nuestro equipo',
    staffMembers: 'Personal',
    itemsCount: 'Artículos',
    joinOfficialDiscord: 'Unirse al servidor oficial de Discord',
    adminEdit: 'Edición admin',
    expand: 'Expandir',
    minimize: 'Minimizar',
    noTeamMembers: 'Aún no hay miembros de equipo listados.',
    catalogStat: 'Catálogo',
    totalValueStat: 'Valor Total',
    firestoreQuotaTitle: 'Límite de cuota diaria gratuita de Firestore alcanzado:',
    firestoreQuotaDesc: 'Se alcanzaron las unidades de lectura diaria gratuitas (50,000/día) por hoy. Military Tycoon Services está operando con caché local y datos del catálogo sin conexión. Las cuotas se reinician diariamente a la medianoche PST.',
    enableBillingUpgrade: 'Activar facturación / Mejorar',

    // Additional keys for UI polish & trade calculator
    switchToCompact: 'Cambiar a modo compacto',
    switchToExpanded: 'Cambiar a modo expandido',
    compact: 'Compacto',
    expandFilters: 'Expandir filtros',
    collapseFilters: 'Colapsar filtros',
    rarity: 'Rareza',
    all: 'Todos',
    trend: 'Tendencia',
    allTrends: 'Todas las tendencias',
    fresh: 'Impecable',
    rankStar: 'Rango / Estrella',
    collapse: 'Plegar',
    recent: 'Reciente',
    today: 'Hoy',
    justNow: 'Ahora mismo',
    ago: 'hace',
    yesterday: 'Ayer',
    moveToTheirOffer: 'Mover a su oferta',
    moveToYourOffer: 'Mover a tu oferta',
    remove: 'Eliminar',
    stars: 'Estrellas',
    gems: 'Gemas',
    theirOfferTheyGive: 'Su oferta (Ellos dan)',
    theirTotalReceived: 'Total recibido',
    gemTaxRate: 'Tasa de impuesto de gemas (8%)',
    addItemTo: 'Agregar objeto a',
    yourSide: 'Tu lado',
    theirSide: 'Su lado',
    of: 'de',
    pickerDesc: 'Toca un objeto o selecciona un nivel de estrellas directamente para agregarlo a la oferta.',
    searchVehiclePlaceholder: 'Buscar objeto por nombre, acrónimo...',
    sortValueHigh: 'Valor (Mayor a Menor)',
    sortValueLow: 'Valor (Menor a Mayor)',
    sortNameAZ: 'Nombre (A-Z)',
    showing: 'Mostrando',
    clearTradePrompt: '¿Estás seguro de que deseas vaciar todos los objetos y gemas de ambos lados?',
    clearTradeWarning: 'Esto restablecerá tu calculadora de intercambios.'
  },
  en: {
    // Brand & General
    brandTitle: 'MILITARY TYCOON SERVICES',
    brandSubtitle: 'Unofficial Community Valuation Guide for Military Tycoon',
    settings: 'Settings',
    settingsTitle: 'System Settings',
    settingsSubtitle: 'Customize your visual experience, card display mode, and language',
    displayMode: 'Display Mode',
    compactMode: 'Compact Mode',
    compactModeShort: 'Compact',
    compactModeDesc: 'Displays condensed, efficient cards to view more items simultaneously.',
    extendedMode: 'Extended Mode',
    extendedModeShort: 'Extended',
    extendedModeDesc: 'Displays full cards with prominent hero images, demand bars, and rich stats.',
    appearance: 'Theme & Appearance',
    lightMode: 'Light Mode',
    lightModeDesc: 'Bright, clean layout with warm amber accents for daytime use.',
    darkMode: 'Dark Mode',
    darkModeDesc: 'High-contrast dark layout designed for visual comfort and night sessions.',
    language: 'Website Language',
    languageDesc: 'Select the website interface language. Item names and personal names remain in their original form.',
    languageNotice: 'Vehicle, weapon, and staff names remain unchanged.',
    spanish: 'Español (Spanish)',
    english: 'English',
    active: 'Active',
    defaultBadge: 'Default',
    optionalBadge: 'Optional',
    aboutTeamSectionSetting: 'About & Our Team Section',
    showExpanded: 'Show Expanded',
    showExpandedSub: 'Default open section',
    permanentlyMinimized: 'Permanently Minimized',
    permanentlyMinimizedSub: 'Compact collapsed bar',
    done: 'Done',
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    reset: 'Reset',
    clear: 'Clear',
    edit: 'Edit',
    delete: 'Delete',
    search: 'Search',
    searchPlaceholder: 'Search items by weapons, stats, or notes...',
    navSearchPlaceholder: 'Search items, vehicles, weapons...',
    bufferingSearch: 'Buffering search...',
    clearSearch: 'Clear search',
    
    // Navigation & Actions
    tradeCalc: 'Trade Calc',
    tradeCalcShort: 'Calc',
    openTradeCalc: 'Open Trade Calculator',
    officialDiscord: 'Official Discord Server',
    staffPortal: 'Staff Portal',
    staffLogin: 'Staff Login',
    staffLogout: 'Log out of Staff Mode',
    staffAccess: 'Staff Access',
    termsOfService: 'Terms of Service',
    backToCatalog: 'Back to Catalog',
    backToValueList: 'Back to Value List',
    scrollToTop: 'Scroll to Top',
    loadMoreRemaining: 'remaining',
    loadingNextItems: 'Loading next items on scroll...',
    scrollOrClickLoadMore: 'Scroll or Click to Load More',
    lastUpdated: 'Last updated',
    liveMarketTicker: 'Live Market',
    
    // Categories
    catAll: 'All Items',
    catAir: 'Air',
    catLand: 'Land',
    catNaval: 'Naval',
    catSoldier: 'Soldier',
    catDrone: 'Drone',
    catTags: 'Tags',
    catOther: 'Other',
    allItemsCount: 'All Items',
    categoryItemsCount: 'Items',
    
    // Rarities
    rarityLimitedEdition: 'Limited Edition',
    rarityExotic: 'Exotic',
    rarityLegendary: 'Legendary',
    rarityEpic: 'Epic',
    rarityRare: 'Rare',
    rarityCommon: 'Common',
    rarityLabel: 'Rarity:',
    clearRarityFilter: 'Clear',
    
    // Trends
    trendAll: 'All Trends',
    trendGlazed: 'Glazed',
    trendRising: 'Rising ↗',
    trendStable: 'Stable ═',
    trendDropping: 'Dropping ↘',
    trendUnstable: 'Unstable',
    marketTrend: 'Market Trend',
    
    // Sorting
    sortBy: 'Sort by:',
    sortHighestValue: 'Highest Value',
    sortLowestValue: 'Lowest Value',
    sortHighestDemand: 'Highest Demand',
    sortLowestDemand: 'Lowest Demand',
    sortAlphabetical: 'Alphabetical (A-Z)',
    sortRecentlyUpdated: 'Recently Updated',
    sortBiggestGain: 'Biggest Gain',
    highestValue: 'Highest Value',
    lowestValue: 'Lowest Value',
    highestDemand: 'Highest Demand',
    lowestDemand: 'Lowest Demand',
    nameAsc: 'Alphabetical (A-Z)',
    recentlyUpdated: 'Recently Updated',
    viewReelList: 'View List',
    activeReelItems: 'Items in Recently Updated',
    
    // Demand & Stats
    demand: 'Demand',
    minDemand: 'Min Demand',
    demandAny: 'All',
    demandMax: 'Max Demand',
    demandVeryHigh: 'Very High',
    demandHigh: 'High Demand',
    demandModerate: 'Moderate',
    demandLow: 'Low Demand',
    demandVeryLow: 'Very Low',
    
    // Item Card & Details
    value: 'VALUE',
    starTier: 'Star Tier',
    starBonus: 'Star Bonus',
    rankMultiplier: 'Rank / Star Multiplier',
    gemRange: 'Gem Range:',
    tradeable: 'TRADEABLE',
    untradeable: 'UNTRADEABLE',
    override: 'Override',
    inspectDetails: 'Inspect Details Page',
    full: 'Full',
    fullPage: 'Full Page',
    quickEdit: 'Quick Edit',
    suggest: 'Suggest',
    expandCard: 'Expand card',
    collapseCard: 'Collapse to compact view',
    viewNotes: 'View Item Notes',
    hideNotes: 'Hide Item Notes',
    itemNotes: 'Item Notes',
    noNotes: 'No notes recorded for this item.',
    base: 'Base',
    total: 'Total',
    multiplier: 'multiplier',
    freshStock: 'Fresh',
    
    // Item Detail Page
    marketStats: 'Market Stats',
    priceHistory: 'Price History',
    inGameDetails: 'In-Game Details',
    inGameCost: 'In-Game Cost',
    speed: 'Speed',
    damage: 'Damage',
    health: 'Health',
    obtainableFrom: 'Obtainable From',
    starVariations: 'Star Variations & Multipliers',
    starVariationsDesc: 'Check values calculated based on item star tier upgrade level.',
    addToTradeCalc: 'Add to Trade Calculator',
    suggestCorrection: 'Suggest Value Correction',
    changeHistory: 'Audit History',
    shareItem: 'Share Item',
    linkCopied: 'Link Copied!',
    copyLink: 'Copy Link',
    printPage: 'Print',
    days30: '30 Days',
    days90: '90 Days',
    allTime: 'All Time',
    recordedDataPoints: 'Recorded Data Points',
    priceHistoryStableNotice: 'This item has remained stable at its benchmark value.',
    recentAuditHistory: 'Recent Audit History',
    untradeableBadge: 'UNTRADEABLE',
    setTradeable: 'Set Tradeable',
    setUntradeable: 'Set Untradeable',
    tradeCalcBtn: 'Trade Calc',
    staffEditBtn: 'Staff Edit',
    verifiedIndex: 'Verified Market Valuation Index',
    selectUpgradeTier: 'Select Upgrade Tier:',
    selectRankMultiplier: 'Select Rank / Multiplier:',
    activeLabel: 'Active',
    trendAndMomentum: 'Trend & Momentum',
    totalShift: 'Total Shift',
    demandScore: 'Demand',
    descriptionNotes: 'Description / Notes',
    editDescription: 'Edit Description',
    addDescription: '+ Add Description',
    saveDescription: 'Save Description',
    descriptionSavedSuccess: 'Description saved successfully!',
    noDescriptionNotes: 'No description or notes have been added for this item yet. Staff can click "+ Add Description" above to add one.',
    autoTranslated: 'Automatically translated',
    viewOriginal: 'View original',
    viewTranslation: 'View translation',
    translating: 'Translating...',
    autoTranslateEnabled: 'Auto-translation active',
    autoTranslatedByAI: 'Automatically translated',
    historicalTrajectory: 'Graph',
    comparativeMultiStarCurves: 'Comparative multi-star valuation curves over time',
    activeStarTracking: 'Active star valuation tracking',
    selectedTierBtn: 'Selected Tier',
    starValuationBreakdown: 'Star Valuation Breakdown:',
    communitySuggestionTitle: 'Community Value Suggestion & Trade Evidence',
    communitySuggestionSubtitle: 'Propose verified adjustments with trade logs, screenshots, or market observations',
    suggestionSubmittedAudit: 'Suggestion Submitted for Audit Review!',
    suggestionAuditThanks: 'Thank you for contributing to the Military Tycoon Services index. Our staff team will audit this trade evidence.',
    submitAnotherSuggestion: 'Submit Another Suggestion',
    targetStarTier: 'Target Star Tier',
    yourRobloxUsername: 'Your Roblox Username',
    discordTagOptional: 'Discord Tag / Username (Optional)',
    evidenceProofUrl: 'Evidence / Proof URL or Screenshot Link',
    reasonMarketJustification: 'Reason & Market Justification',
    reasonMarketPlaceholder: 'Describe recent trades, demand changes, or in-game market shifts...',
    verifiedModificationAuditHistory: 'Verified Modification Audit History',
    staffOnly: 'Staff Only',
    chronologicalLogAudits: 'Chronological log of verified staff audits and value updates',
    noRecentAuditLogs: 'No recent manual staff audit logs on record for this item. Current value reflects initial benchmark.',
    tableTimestamp: 'Timestamp',
    tableAction: 'Action',
    tableValuationShift: 'Valuation Shift',
    tableDetailsReason: 'Details / Reason',
    tableAuditor: 'Auditor',
    offerBtn: '+ Offer',
    receiveBtn: '+ Receive',
    enterCombatNotesPlaceholder: 'Enter combat meta notes, lore, or trading insights...',
    
    // Empty states
    noItemsFound: 'No Matching Items Found',
    noItemsFoundDesc: 'No items match your active filters. Try adjusting your search query or rarity settings.',
    catalogReady: 'Catalog Ready For Items',
    catalogReadyDesc: 'The item list has been cleared. Use the staff panel to add and verify fresh assets.',
    addItemStaff: 'Add Item via Staff Portal',
    filters: 'Filters',
    resetAll: 'Reset All',
    
    // Trade Calculator
    tradeCalculatorTitle: 'Trade Calculator',
    tradeCalculatorSubtitle: 'Compare trade offers, compute 8% gem tax, and assess valuation balance.',
    youGive: 'You Give',
    theyGive: 'They Give',
    you: 'You',
    them: 'Them',
    addItems: 'Add Items',
    addItem: 'Add Item',
    clearTrade: 'Clear Trade',
    swapSides: 'Swap Sides',
    balanceWithGems: 'Balance with Gems',
    fairTrade: 'Fair Trade',
    bigWin: 'Big Win',
    win: 'Win',
    lose: 'Loss',
    bigLose: 'Big Loss',
    emptyTrade: 'Empty Trade',
    emptyTradeDesc: 'Add items or gems to both sides to evaluate whether the trade is a win or lose.',
    emptyTradePoints: 'Choose items from the catalog or add gems with 8% tax calculation.',
    taxAppliedNotice: '8% gem tax deducted on received gems.',
    customGems: 'Custom Gems',
    addGems: 'Add Gems',
    enterGems: 'Enter amount of gems...',
    searchItemsPlaceholder: 'Search items to add...',
    noItemsInPicker: 'No items found in catalog.',
    quantity: 'Quantity',
    starsTotal: 'Total Stars',
    netValue: 'Net Value',
    difference: 'Difference',
    averageDemand: 'Average Demand',
    copySummary: 'Copy Summary',
    saveTrade: 'Save Trade',
    savedTrades: 'Saved Trades',
    tradeAdvice: 'Trade Advice',
    riskSafe: 'Safe',
    riskCaution: 'Caution',
    riskWarning: 'Warning',
    riskNeutral: 'Neutral',
    selectTier: 'Select star tier',
    
    // Report Modal
    reportModalTitle: 'Report Item Value',
    reportModalSubtitle: 'Help keep values accurate and up to date for the community.',
    suggestValueUpdate: 'Suggest Value Update',
    suggestedValueGems: 'Suggested Value in Gems',
    suggestedValueLabel: 'Suggested Value:',
    suggestedDemand110: 'Estimated Demand (1-10)',
    suggestedDemandLabel: 'Suggested Demand:',
    suggestedTrend: 'Estimated Trend',
    priceTrendLabel: 'Price Trend:',
    reasonOrProof: 'Reason or Proof Link',
    reasonPlaceholder: 'Explain why the value should be updated or provide trade proof screenshots...',
    evidencePlaceholder: 'Discord link, screenshot or video (optional)',
    discordUsernameLabel: 'Discord / Trader Username (Optional)',
    discordUsernamePlaceholder: 'e.g. TraderAlex or Discord#1234',
    proofLinkLabel: 'Proof / Screenshot Link (Optional)',
    captchaRequiredError: 'Cloudflare human verification is required. Please check the box above to verify.',
    submitReport: 'Submit Report',
    submitSuggestion: 'Submit Suggestion',
    verifyToSubmit: 'Verify to Submit',
    submitting: 'Submitting...',
    reportSuccess: 'Report Submitted Successfully!',
    reportSuccessDesc: 'Thank you for contributing to the community. Our staff team will review it.',
    suggestionSubmitted: 'Suggestion Submitted!',
    suggestionLoggedNotice: 'Thank you! Your proposed valuation has been logged.',
    enterValuationPlaceholder: 'Enter valuation (e.g. 50000 for $50K)',
    
    // Price Chart Modal
    chartModalTitle: 'Market Price History',
    chartModalSubtitle: 'Track valuation trends and price shifts over the last 30 days.',
    currentValue: 'Current Value',
    currentTrend: 'Current Trend',
    priceTrackingSubtitle: 'Price tracking & multi-tier valuation analytics',
    allTimePeak: 'All-Time Peak',
    netGainLoss: 'Net Gain / Loss',
    trajectoryGraph: 'Graph',
    displayingAllCurves: 'Displaying all star tiers curves',
    displayingBaselineCurve: 'Displaying primary baseline curve',
    baseLineBtn: 'Base Line',
    allStarValuesBtn: 'All Star Values',
    starMatrixBreakdown: 'All Star Values Breakdown Matrix:',
    addAuditPointStaff: '+ Add Verified Historical Audit Point (Staff)',
    addPriceHistoryPointTitle: 'Add Price History Point',
    newValueLabel: 'New Value ($)',
    dateLabel: 'Date Label',
    transactionNoteLabel: 'Transaction Note',
    commitPoint: 'Commit Point',
    managePointsStaff: 'Manage Graph Points (Staff)',
    removePoint: 'Remove Point',
    confirmRemovePoint: 'Remove this point?',
    addToRecentlyUpdated: 'Add to Recently Updated',
    removeFromRecentlyUpdated: 'Remove from Recently Updated',
    noPointsRecorded: 'No price history points recorded yet',
    
    // Info & Team Section
    aboutMtsTitle: 'About Military Tycoon Services',
    aboutMtsSubtitle: 'Verified, transparent community valuation guide for Roblox',
    ourMission: 'Our Mission',
    ourMissionDesc: 'To provide the most accurate, fair, and up-to-date value list for Military Tycoon on Roblox. We continuously track verified trades and community consensus to maintain a balanced market economy.',
    ourTeam: 'Our Team',
    ourTeamDesc: 'Meet the dedicated staff and contributors who audit and update the MTS value list.',
    roleAdmin: 'Admin',
    roleStaff: 'Staff',
    roleAnalyst: 'Analyst',
    roleFounder: 'Founder',
    roleDeveloper: 'Developer',
    
    // Footer & Quota Banner
    footerDesc: 'Unofficial value guide by MTS for Military Tycoon on Roblox.',
    footerRights: 'All game assets and trademarks belong to their respective owners.',
    quotaBannerTitle: 'Local Catalog Cache Active',
    quotaBannerDesc: 'Database is operating in cached reading mode. You can browse all items normally.',
    dismissBanner: 'Dismiss',

    // Extended Trade Calculator keys
    gemTaxNotice: 'AUTOMATIC 8% TAX',
    gemTaxRateNotice: 'Tax Rate: 8% on Gems',
    flipSides: 'Swap Sides',
    copyPost: 'Copy Post',
    history: 'History',
    saveCurrent: 'Save Current',
    noSavedTrades: 'No saved trades yet. Add items and click "Save Current" to bookmark offers!',
    starsDelta: 'Stars Delta',
    demandDelta: 'Demand Delta',
    withinFairValue: 'Within Fair Value (±5%)',
    imbalance: 'Imbalance',
    autoBalanceTrade: 'Auto-Balance Trade with Gems',
    yourOfferYouGive: 'YOUR OFFER (YOU GIVE)',
    yourTotalGiven: 'Your Total Given',
    addItemToYourSide: 'Add Item to Your Side',
    addItemToTheirSide: 'Add Item to Their Side',
    noItemsOfferedYet: 'No items offered yet',
    noItemsOffered: 'No items offered',
    noItemsOfferedDesc: 'Add vehicles, weapons, or gear to calculate this side of the trade.',
    addItemsToCalc: 'Add vehicles, soldiers, or drones to evaluate trade values.',
    addFirstItem: 'Add First Item',
    yourGemsOffered: 'Your Gems Offered',
    clearGems: 'Clear Gems',
    gemsSentByYou: 'Gems sent by you:',
    taxDeducted: '8% Game Tax deducted:',
    recipientReceivesNet: 'Recipient receives net:',
    theirOfferYouReceive: 'THEIR OFFER (YOU RECEIVE)',
    netValueReceived: 'Net Value Received',
    theirGemsOffered: 'Their Gems Offered',
    gemsSentByThem: 'Gems sent by them:',
    youReceiveNet: 'You receive net (factored in trade):',
    totalUnitsTraded: 'Total Units Traded:',
    enterGemsPlaceholder: 'Enter gems (e.g. 10m, 500k, 1000000)',
    multiAddMode: 'Multi-Add Mode',
    searchVehiclesPlaceholder: 'Search by vehicle name, acronym (e.g. AC-130, F-22, M1A2)...',
    pickerSubtitle: 'Tap a vehicle or select a star tier directly to add to the offer.',
    noMatchingVehicles: 'No matching vehicles found. Try adjusting your search term or category filters.',
    inTrade: 'in trade',
    loadMoreVehicles: 'Load 10 More Vehicles',
    clearTradeTitle: 'Clear Trade Calculator?',
    clearTradeDesc: 'This will remove all items and gems from both sides of the trade.',
    clearAll: 'Clear All',

    // Item Detail Page keys
    catalog: 'Catalog',
    share: 'Share',
    staffEdit: 'Edit (Staff)',
    gemsLabel: 'Gems:',
    staffOverride: 'Staff Override',
    liveStatus: 'Live',
    compareInTradeCalc: 'Compare in Trade Calculator',
    starTierValuation: 'Star Tier Valuation:',
    baseItemValue: 'Default Item Value',
    demandRating: 'Demand Rating',
    marketTrendLabel: 'Market Trend',
    tradeStatusLabel: 'Trade Status',
    tradeableStandard: 'Tradeable (Standard)',
    untradeableLocked: 'Untradeable 🔒',
    priceTrendHistory: 'Price Trend & Historical Value',
    reportSuggestUpdate: 'Report / Suggest Price Update',
    changeAuditLog: 'Change & Audit Log',
    timeframe7d: '7 Days',
    timeframe30d: '30 Days',
    timeframe90d: '90 Days',
    timeframeAll: 'All',
    allTiers: 'All Tiers',
    selectedTierOnly: 'Selected Tier Only',

    // Item Edit Modal keys
    editItemTitle: 'Edit Item',
    saveChanges: 'Save Changes',
    deleteItem: 'Delete Item',
    itemNameLabel: 'Item Name:',
    acronymLabel: 'Acronym (Opt):',
    searchKey: 'Search Key',
    thumbnailLabel: 'Item Thumbnail / Image:',
    pasteImage: 'Paste Image',
    uploadLocal: 'Upload Local File',
    categoryLabel: 'Category:',
    tradeStatus: 'Trade Status:',
    baseItemValuation: 'Default Item Valuation:',
    baseValueLabel: 'Default Value ($ / 💎):',
    baseDemandLabel: 'Default Demand (1–10):',
    baseTrendLabel: 'Default Trend:',
    manualStarOverrides: 'Manual Star Tier Overrides',
    manualGemRange: 'Manual Gem Range Override',
    itemNotesLabel: 'Item Notes / Description:',
    auditReasonLabel: 'Audit Reason (Mod Log):',
    lastUpdatedLabel: 'Last Updated Timestamp:',
    resetGraph: 'Reset Graph to Clean Baseline',
    deleteConfirmTitle: 'Delete Item?',
    deleteConfirmDesc: 'This action cannot be undone.',
    yesDelete: 'Yes, Delete',
    copyToAllTiers: 'Copy to all',
    reFillUniversal: 'Re-fill all from universal',

    // App & General UI
    valueList: 'Value List',
    allItems: 'All Items',
    items: 'Items',
    staffModeActive: 'Staff Mode Active',
    noMatchingItems: 'No Matching Items Found',
    noMatchingDesc: 'No items match your active filters. Try adjusting your search query or rarity settings.',
    addItemViaStaff: 'Add Item via Staff Portal',
    loadMore: 'Load More',
    remaining: 'remaining',
    staffAuth: 'Staff Authentication',
    tos: 'Terms of Service',
    awaitingUpdates: 'Awaiting updates',
    aboutMilitaryTycoonServices: 'About Military Tycoon Services',
    aboutMtsAndTeam: 'About Military Tycoon Services & Our Team',
    staffMembers: 'Staff',
    itemsCount: 'Items',
    joinOfficialDiscord: 'Join Official Discord Server',
    adminEdit: 'Admin Edit',
    expand: 'Expand',
    minimize: 'Minimize',
    noTeamMembers: 'No team members listed yet.',
    catalogStat: 'Catalog',
    totalValueStat: 'Total Value',
    firestoreQuotaTitle: 'Firestore Free Tier Daily Quota Limit Reached:',
    firestoreQuotaDesc: 'Free daily read units (50,000/day) have been reached for today. Military Tycoon Services is operating with local cache & offline catalog data. Quotas reset daily at midnight PST.',
    enableBillingUpgrade: 'Enable Billing / Upgrade',

    // Additional keys for UI polish & trade calculator
    switchToCompact: 'Switch to Compact',
    switchToExpanded: 'Switch to Expanded',
    compact: 'Compact',
    expandFilters: 'Expand Filters',
    collapseFilters: 'Collapse Filters',
    rarity: 'Rarity',
    all: 'All',
    trend: 'Trend',
    allTrends: 'All Trends',
    fresh: 'Fresh',
    rankStar: 'Rank / Star',
    collapse: 'Collapse',
    recent: 'Recent',
    today: 'Today',
    justNow: 'Just now',
    ago: 'ago',
    yesterday: 'Yesterday',
    moveToTheirOffer: 'Move to Their Offer',
    moveToYourOffer: 'Move to Your Offer',
    remove: 'Remove',
    stars: 'Stars',
    gems: 'Gems',
    theirOfferTheyGive: 'Their Offer (They Give)',
    theirTotalReceived: 'Total Received',
    gemTaxRate: 'Gem Tax Rate (8%)',
    addItemTo: 'Add item to',
    yourSide: 'Your side',
    theirSide: 'Their side',
    of: 'of',
    pickerDesc: 'Tap an item or select a star tier directly to add it to the offer.',
    searchVehiclePlaceholder: 'Search item by name, acronym...',
    sortValueHigh: 'Value (High to Low)',
    sortValueLow: 'Value (Low to High)',
    sortNameAZ: 'Name (A-Z)',
    showing: 'Showing',
    clearTradePrompt: 'Are you sure you want to clear all items and gems from both sides?',
    clearTradeWarning: 'This will reset your trade calculator.'
  }
};

/**
 * Helper to get translated category label while keeping the category ID exact
 */
export function getTranslatedCategory(category: string, lang: SupportedLanguage): string {
  const dict = TRANSLATIONS[lang];
  switch (category) {
    case 'All': return dict.catAll;
    case 'Air': return dict.catAir;
    case 'Land': return dict.catLand;
    case 'Naval':
    case 'Sea': return dict.catNaval;
    case 'Soldier': return dict.catSoldier;
    case 'Drone': return dict.catDrone;
    case 'Tags': return dict.catTags;
    case 'Other': return dict.catOther;
    default: return category;
  }
}

/**
 * Helper to get translated rarity label
 */
export function getTranslatedRarity(rarity: string, lang: SupportedLanguage): string {
  const dict = TRANSLATIONS[lang];
  switch (rarity) {
    case 'Limited Edition': return dict.rarityLimitedEdition;
    case 'Exotic': return dict.rarityExotic;
    case 'Legendary': return dict.rarityLegendary;
    case 'Epic': return dict.rarityEpic;
    case 'Rare': return dict.rarityRare;
    case 'Common': return dict.rarityCommon;
    default: return rarity;
  }
}

/**
 * Helper to get translated trend label
 */
export function getTranslatedTrend(trend: string, lang: SupportedLanguage): string {
  const dict = TRANSLATIONS[lang];
  const t = trend.toLowerCase().trim();
  if (t.includes('glazed') || t.includes('hyped')) return dict.trendGlazed;
  if (t.includes('rising') || t.includes('subiendo')) return dict.trendRising;
  if (t.includes('dropping') || t.includes('bajando')) return dict.trendDropping;
  if (t.includes('unstable') || t.includes('inestable') || t.includes('fluctuating') || t.includes('volatile') || t.includes('overpriced')) return dict.trendUnstable;
  if (t.includes('stable') || t.includes('estable')) return dict.trendStable;
  return trend;
}

/**
 * Helper to get translated demand description
 */
export function getTranslatedDemandLabel(score: number | string, lang: SupportedLanguage): string {
  const dict = TRANSLATIONS[lang];
  let parsed = typeof score === 'string' ? parseFloat(score) : score;
  if (isNaN(parsed)) parsed = 1;
  const num = Math.max(1, Math.min(10, Math.round(parsed)));
  if (num === 10) return dict.demandMax;
  if (num >= 9) return dict.demandVeryHigh;
  if (num >= 7) return dict.demandHigh;
  if (num >= 5) return dict.demandModerate;
  if (num >= 3) return dict.demandLow;
  return dict.demandVeryLow;
}
