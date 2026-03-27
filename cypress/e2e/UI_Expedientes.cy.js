describe('Módulo de Expedientes (UI)', () => {

  beforeEach(() => {
    // 1. Saltamos el login usando nuestro comando personalizado
    cy.loginAsAdmin()
    // 2. Navegamos directamente a la vista de expedientes
    cy.visit('/expedientes.html')
  })

  it('Verifica que los KPIs superiores se rendericen correctamente', () => {
    // 3. Verificamos mediante el ID único de cada tarjeta que esté visible en pantalla
    cy.get('#statTotal').should('be.visible')
    cy.get('#statIngreso').should('be.visible')
    cy.get('#statEnInspeccion').should('be.visible')
    cy.get('#statSalida').should('be.visible')
    cy.get('#statPlazoOtorgado').should('be.visible')
  })

  it('Prueba la apertura y cierre del formulario para crear un Nuevo Expediente', () => {
    // 4. Hacemos clic en el botón con ID "btnNuevo"
    cy.get('#btnNuevo').click()
    
    // 5. El código JS de tu web genera el modal, verificamos que su formulario sea visible
    cy.get('#formExpediente').should('be.visible')
    
    // 6. Verificamos que los inputs clave existen y están listos para que un usuario escriba
    cy.get('#fecha').should('be.visible')
    cy.get('#dni').should('be.visible')
    cy.get('#numero_expediente').should('be.visible')
    
    // 7. Probamos la acción de cancelar y verificamos que el modal desaparezca del sistema (not.exist)
    cy.get('#btnCancelarModal').click()
    cy.get('#formExpediente').should('not.exist')
  })

  it('Evalúa la barra de búsqueda y el retardo automático (debounce)', () => {
    // 8. Escribimos un DNI en el buscador rápido ubicado en la parte superior
    cy.get('#searchInput').type('12345678')
    
    // 9. Como en tu código agregaste un "debounce" de 500ms, le decimos a Cypress que espere un poquito (600ms)
    cy.wait(600)
    
    // 10. Verificamos que la tabla principal donde se alojan los resultados no se haya roto
    cy.get('.table-container').should('be.visible')
  })
})
