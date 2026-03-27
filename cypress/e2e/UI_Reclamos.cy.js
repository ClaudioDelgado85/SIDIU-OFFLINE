describe('Módulo de Reclamos (UI)', () => {

  beforeEach(() => {
    cy.loginAsAdmin()
    cy.visit('/reclamos.html')
  })

  it('Valida el tablero de reclamos e incidentes', () => {
    cy.get('#statTotal').should('be.visible')
    cy.get('#statPendientes').should('be.visible')
    cy.get('#statEnProceso').should('be.visible')
    cy.get('#statResueltos').should('be.visible')
  })

  it('Prueba carga de Nuevo Reclamo', () => {
    cy.get('#btnNuevo').click()
    cy.get('#formReclamo').should('be.visible')
    cy.get('#btnCancelarModal').click()
    cy.get('#formReclamo').should('not.exist') // Removido del DOM
  })

  it('Filtro interactivo y debounce', () => {
    cy.get('#searchInput').type('Bache')
    cy.wait(600)
    cy.get('.table-container').should('be.visible')
  })
})
