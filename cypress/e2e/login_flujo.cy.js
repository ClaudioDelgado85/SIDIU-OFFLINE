describe('Flujo de Autenticación', () => {
  beforeEach(() => {
    // Limpiar sesión antes de cada prueba para arrancar de cero
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('Inicia sesión exitosamente como admin y guarda el token', () => {
    cy.visit('/login.html')
    
    // Rellenamos el formulario
    cy.get('#usuario').type('admin')
    cy.get('#password').type('admin123')
    cy.get('button[type="submit"]').click()
    
    // Cypress esperará automáticamente a que cambie la URL
    cy.url().should('include', '/dashboard.html')
    
    // Verificamos que los datos se guardaron localmente
    cy.window().its('localStorage').invoke('getItem', 'token').should('exist')
    cy.window().its('localStorage').invoke('getItem', 'usuario').should('exist')
  })

  it('Rechaza el acceso a Dashboard sin token (Redirección obligada)', () => {
    // Intentamos entrar directo como hackers
    cy.visit('/dashboard.html')
    
    // El script del frontend (auth.js) debería detectarlo y devolvernos al login
    cy.url().should('include', '/login.html')
  })
})
