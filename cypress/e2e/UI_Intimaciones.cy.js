describe('Módulo de Intimaciones (UI)', () => {

  beforeEach(() => {
    // Saltamos el proceso de escribir usuario y contraseña gracias al custom command
    cy.loginAsAdmin()
    cy.visit('/intimaciones.html')
  })

  it('Renderiza correctamente las tarjetas de KPIs analíticos', () => {
    // Cypress verificará que existan y sean visibles las tarjetas de estado
    cy.get('#statTotal').should('be.visible')
    cy.get('#statProximas').should('be.visible')
    cy.get('#statVencidas').should('be.visible')
    cy.get('#statCumplidas').should('be.visible')
  })

  it('Abre el modal de "Nueva Intimación" y valida la UI del formulario', () => {
    // Da click en el botón de nueva intimación
    cy.get('#btnNuevo').click()
    
    // El formulario debería aparecer (se genera dinámicamente)
    cy.get('#formIntimacion').should('be.visible')
    
    // Los campos principales deberían estar listos para escribir
    cy.get('#fecha').should('be.visible')
    cy.get('#dni').should('be.visible')
    cy.get('#direccion').should('be.visible')
    
    // Cerramos el modal
    cy.get('#btnCancelarModal').click()
    cy.get('#formIntimacion').should('not.exist')
  })

  it('Permite ejecutar una búsqueda en la tabla (Simulación)', () => {
    cy.get('#searchInput').type('12345678')
    
    // El código frontend espera 500ms por el debounce automático
    cy.wait(600)
    
    // Verificamos que la tabla no se rompa y siga ahí
    cy.get('.table-container').should('be.visible')
  })
})
