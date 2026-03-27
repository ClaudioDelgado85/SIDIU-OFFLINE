describe('Módulo de Usuarios y Seguridad (UI)', () => {

  beforeEach(() => {
    cy.loginAsAdmin()
    cy.visit('/usuarios.html')
  })

  it('Valida el control de seguridad y métricas de roles', () => {
    cy.get('#statTotal').should('be.visible')
    cy.get('#statAdmin').should('be.visible')
    cy.get('#statCarga').should('be.visible')
    cy.get('#statConsulta').should('be.visible')
  })

  it('Evalúa la creación de cuentas del personal Municipal', () => {
    // Busca botón específico de usuarios
    cy.get('#btnNuevoUsuario').click()
    
    // Debería abrirse ventana lateral (usa un panel lateral dinámico)
    cy.get('.panel-lateral').should('be.visible')
    
    // Cerrar panel modal interactivo
    cy.contains('button', 'Cancelar').click()
    cy.get('.panel-lateral').should('not.exist') 
  })
})
