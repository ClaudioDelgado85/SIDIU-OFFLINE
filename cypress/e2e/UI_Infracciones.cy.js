describe('Módulo de Infracciones (UI)', () => {

  beforeEach(() => {
    cy.loginAsAdmin()
    cy.visit('/infracciones.html')
  })

  it('Renderiza indicadores principales', () => {
    cy.get('#statTotal').should('be.visible')
    cy.get('#statPendientes').should('be.visible')
    cy.get('#statPagadas').should('be.visible')
    cy.get('#statAnuladas').should('be.visible')
  })

  it('Abre el modal para crear Infracción', () => {
    cy.get('#btnNuevo').click()
    cy.get('#formInfraccion').should('be.visible')
    cy.get('#btnCancelarModal').click()
    cy.get('#formInfraccion').should('not.exist')
  })

  it('Buscador cuenta con auto-respuesta (debounce)', () => {
    cy.get('#searchInput').type('AAA123')
    cy.wait(600)
    cy.get('.table-container').should('be.visible')
  })
})
