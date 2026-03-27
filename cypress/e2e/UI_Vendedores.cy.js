describe('Módulo de Vendedores Ambulantes (UI)', () => {

  beforeEach(() => {
    cy.loginAsAdmin()
    cy.visit('/vendedores.html')
  })

  it('Verifica el panel de estadísticas y reportes', () => {
    // Vendedores usa distintos KPIs
    cy.get('#statTotal').should('be.visible')
    cy.get('#statAutorizados').should('be.visible')
    cy.get('#statNoAutorizados').should('be.visible')
    cy.get('#statPagaronCanon').should('be.visible')
    cy.get('#statCanonVencido').should('be.visible')
  })

  it('Inicia validación de grilla editable (Excel en vivo)', () => {
    // Verifica que la fila nueva en la tabla HTML donde se meten datos exista
    cy.get('.fila-nueva').should('be.visible')
    cy.get('.fila-nueva input[data-field="nombre_vendedor"]').should('be.visible')
    cy.get('.fila-nueva input[data-field="ubicacion"]').should('be.visible')
  })

  it('Verifica los botones de la barra de acciones superior', () => {
    cy.get('#btnExportar').should('be.visible')
    cy.get('#btnFiltros').click()
    cy.get('#filtersPanel').should('be.visible')
  })
})
