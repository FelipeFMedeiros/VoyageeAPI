import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';

dotenv.config();

const getServerUrl = () => {
    const host = '192.168.1.128';
    const port = process.env.PORT || 3000;
    return `http://${host}:${port}`;
};

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Voyagee API',
            version: '1.0.0',
            description: 'API oficial do Voyagee para gerenciar todo o website.',
        },
        servers: [
            {
                url: getServerUrl(),
                description: process.env.NODE_ENV === 'production' 
                    ? 'Servidor de Produção' 
                    : 'Servidor de Desenvolvimento'
            }
        ],
        tags: [
            {
                name: 'Autenticação',
                description: 'Operações relacionadas à autenticação e gestão de usuários',
            },
            {
                name: 'Guias',
                description: 'Operações relacionadas aos guias turísticos',
            },
            {
                name: 'Passeios',
                description: 'Operações relacionadas aos passeios e roteiros',
            },
            {
                name: 'Reservas',
                description: 'Operações relacionadas às reservas de passeios',
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            },
            schemas: {
                Usuario: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'ID único do usuário'
                        },
                        nome: {
                            type: 'string',
                            description: 'Nome completo do usuário'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'Email do usuário'
                        },
                        cpf: {
                            type: 'string',
                            description: 'CPF do usuário'
                        },
                        telefone: {
                            type: 'string',
                            description: 'Telefone do usuário'
                        },
                        tipo: {
                            type: 'string',
                            enum: ['guia', 'viajante'],
                            description: 'Tipo do usuário'
                        },
                        dataNascimento: {
                            type: 'string',
                            format: 'date',
                            description: 'Data de nascimento'
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Data de criação do registro'
                        }
                    }
                },
                Endereco: {
                    type: 'object',
                    properties: {
                        cep: {
                            type: 'string',
                            description: 'CEP'
                        },
                        pais: {
                            type: 'string',
                            description: 'País'
                        },
                        estado: {
                            type: 'string',
                            description: 'Estado (UF)'
                        },
                        cidade: {
                            type: 'string',
                            description: 'Cidade'
                        },
                        bairro: {
                            type: 'string',
                            description: 'Bairro'
                        },
                        rua: {
                            type: 'string',
                            description: 'Rua/Logradouro'
                        },
                        numero: {
                            type: 'string',
                            description: 'Número'
                        },
                        complemento: {
                            type: 'string',
                            description: 'Complemento'
                        }
                    }
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            description: 'Status da operação'
                        },
                        token: {
                            type: 'string',
                            description: 'Token JWT de autenticação'
                        },
                        user: {
                            $ref: '#/components/schemas/Usuario'
                        }
                    }
                },
                RegistroRequest: {
                    type: 'object',
                    required: ['userType', 'name', 'email', 'cpf', 'phone', 'password'],
                    properties: {
                        userType: {
                            type: 'string',
                            enum: ['guia', 'viajante'],
                            description: 'Tipo de usuário'
                        },
                        name: {
                            type: 'string',
                            description: 'Nome completo'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'Email'
                        },
                        cpf: {
                            type: 'string',
                            description: 'CPF'
                        },
                        phone: {
                            type: 'string',
                            description: 'Telefone'
                        },
                        password: {
                            type: 'string',
                            format: 'password',
                            description: 'Senha'
                        },
                        dataNascimento: {
                            type: 'string',
                            format: 'date',
                            description: 'Data de nascimento'
                        },
                        endereco: {
                            $ref: '#/components/schemas/Endereco'
                        },
                        biografia: {
                            type: 'string',
                            description: 'Biografia (apenas para guias)'
                        }
                    }
                },
                PaginationResponse: {
                    type: 'object',
                    properties: {
                        currentPage: {
                            type: 'integer',
                            description: 'Página atual'
                        },
                        totalPages: {
                            type: 'integer',
                            description: 'Total de páginas'
                        },
                        totalItems: {
                            type: 'integer',
                            description: 'Total de itens'
                        },
                        itemsPerPage: {
                            type: 'integer',
                            description: 'Itens por página'
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            default: false,
                            description: 'Status da operação'
                        },
                        message: {
                            type: 'string',
                            description: 'Mensagem de erro'
                        },
                        details: {
                            type: 'object',
                            description: 'Detalhes adicionais do erro (quando disponível)'
                        }
                    }
                }
            }
        },
        security: [{
            bearerAuth: []
        }]
    },
    apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

console.log('Swagger Server URL:', getServerUrl());
console.log('NODE_ENV:', process.env.NODE_ENV);

export default swaggerSpec;