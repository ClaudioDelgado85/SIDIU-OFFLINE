describe('Módulo de Infracciones (UI)', () => {

  beforeEach(() => {
    cy.loginAsAdmin()
    cy.visit('/infracciones.html')
  })

  it('Renderiza la vista principal correctamente', () => {
    // Infracciones no cuenta con el componente stats-grid en la parte superior
    cy.get('h1').should('contain', 'Actas de Infracción')
    cy.get('#btnNuevo').should('be.visible')
    cy.get('#btnExportar').should('be.visible')
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
