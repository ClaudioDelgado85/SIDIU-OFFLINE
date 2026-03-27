describe('Módulo de Comercios (UI)', () => {

  beforeEach(() => {
    cy.loginAsAdmin()
    cy.visit('/comercios.html')
  })

  it('Renderiza los KPIs de estados de comercios', () => {
    cy.get('#statTotal').should('be.visible')
    cy.get('#statHabilitados').should('be.visible')
    cy.get('#statNoHabilitados').should('be.visible')
    cy.get('#statReempadronamiento').should('be.visible')
  })

  it('Carga la grilla editable tipo planilla', () => {
    // A diferencia de otros, no tiene botón nuevo modal, sino una tabla directa
    cy.get('#tabla-comercios').should('be.visible')
    cy.get('#btnExportar').should('be.visible')
  })

  it('Verifica el buscador rápido', () => {
    cy.get('#filtro-busqueda').type('Supermercado')
    cy.get('#btnFiltros').click()
    cy.get('#filtersPanel').should('be.visible')
  })
})
