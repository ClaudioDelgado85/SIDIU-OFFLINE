// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
// ***********************************************

Cypress.Commands.add('loginAsAdmin', () => {
    // Restaurado a la forma sencilla, dado que ya levantamos el Rate Limit a 2000 Requests
    cy.visit('/login.html')
    cy.get('#usuario').type('admin')
    cy.get('#password').type('admin123')
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/dashboard.html')
    cy.window().its('localStorage').invoke('getItem', 'token').should('exist')
})
