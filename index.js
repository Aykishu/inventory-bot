const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    REST,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    InteractionResponseFlags
} = require('discord.js');

const Database = require('better-sqlite3');
const express = require('express');

const app = express();

// ================= WEB SERVER =================

app.get('/', (req, res) => {
    res.send('Hells Legion Inventory Online');
});

app.listen(process.env.PORT || 3000, () => {
    console.log('🌐 Web server lancé.');
});

// ================= CONFIG =================

const config = {
    token: process.env.TOKEN,

    clientId: "1507287568440627261",
    guildId: "1478420890051018765",

    allowedRoles: [
        "Président",
        "Vice-président",
        "Sergent d'armes",
        "Trésorier",
        "Secrétaire"
    ],

    logChannelName: "📦・│stockage"
};

// ================= CLIENT =================

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ================= DATABASE =================

const db = new Database('stocks.db');

db.prepare(`
CREATE TABLE IF NOT EXISTS stocks (
    item TEXT PRIMARY KEY,
    quantity INTEGER NOT NULL,
    category TEXT NOT NULL
)
`).run();

console.log("✅ SQLite connecté.");

// ================= CATEGORIES =================

const categories = {
    ressources: "🔨 Ressources",
    medical: "💊 Médical",
    armes: "🔫 Armurerie",
    vehicules: "🚗 Véhicules",
    nourriture: "🍔 Nourriture",
    divers: "📦 Divers"
};

// ================= TEMP STORAGE =================

const pendingAdds = new Map();

// ================= COMMANDES =================

const commands = [

    new SlashCommandBuilder()
        .setName('inventaire')
        .setDescription('Ouvrir le panel inventaire')

].map(command => command.toJSON());

// ================= REGISTER COMMANDS =================

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {

    try {

        await rest.put(
            Routes.applicationGuildCommands(
                config.clientId,
                config.guildId
            ),
            { body: commands }
        );

        console.log("✅ Commandes enregistrées.");

    } catch (err) {

        console.error(err);

    }

})();

// ================= READY =================

client.once('clientReady', () => {

    console.log(`✅ ${client.user.tag} connecté.`);

});

// ================= PERMISSIONS =================

function hasPermission(interaction) {

    return interaction.member.roles.cache.some(
        role => config.allowedRoles.includes(role.name)
    );

}

// ================= LOGS =================

function sendLog(interaction, message) {

    const logsChannel = interaction.guild.channels.cache.find(
        c => c.name === config.logChannelName
    );

    if (logsChannel) {
        logsChannel.send(message);
    }

}

// ================= EMBED =================

function createMainEmbed() {

    const totalItems = db.prepare(`
        SELECT COUNT(*) as count FROM stocks
    `).get().count;

    const totalQuantity = db.prepare(`
        SELECT SUM(quantity) as total FROM stocks
    `).get().total || 0;

    return new EmbedBuilder()
        .setTitle('📦 HELLS LEGION • INVENTAIRE')
        .setDescription(`
Bienvenue dans le système de stockage.

🔨 Ressources
💊 Médical
🔫 Armurerie
🚗 Véhicules
🍔 Nourriture
📦 Divers
`)
        .addFields({
            name: '📊 Statistiques',
            value:
`📦 Items : ${totalItems}
📈 Quantité totale : ${totalQuantity}`
        })
        .setColor('#8B0000')
        .setFooter({
            text: 'Inventory System V7'
        });

}

// ================= BUTTONS =================

function createButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId('view_stock')
                    .setLabel('Voir Stock')
                    .setEmoji('📦')
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId('refresh_stock')
                    .setLabel('Actualiser')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)

            ),

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId('add_stock')
                    .setLabel('Ajouter')
                    .setEmoji('➕')
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId('remove_stock')
                    .setLabel('Retirer')
                    .setEmoji('➖')
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId('delete_stock')
                    .setLabel('Supprimer')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId('search_stock')
                    .setLabel('Rechercher')
                    .setEmoji('🔍')
                    .setStyle(ButtonStyle.Primary)

            )

    ];

}

// ================= CATEGORY MENU =================

function createCategoryMenu(customId = 'category_select') {

    return new ActionRowBuilder()
        .addComponents(

            new StringSelectMenuBuilder()
                .setCustomId(customId)
                .setPlaceholder('📂 Choisir une catégorie')
                .addOptions([
                    {
                        label: 'Ressources',
                        value: 'ressources',
                        emoji: '🔨'
                    },
                    {
                        label: 'Médical',
                        value: 'medical',
                        emoji: '💊'
                    },
                    {
                        label: 'Armurerie',
                        value: 'armes',
                        emoji: '🔫'
                    },
                    {
                        label: 'Véhicules',
                        value: 'vehicules',
                        emoji: '🚗'
                    },
                    {
                        label: 'Nourriture',
                        value: 'nourriture',
                        emoji: '🍔'
                    },
                    {
                        label: 'Divers',
                        value: 'divers',
                        emoji: '📦'
                    }
                ])

        );

}

// ================= INTERACTIONS =================

client.on('interactionCreate', async interaction => {

    try {

        // ================= SLASH COMMAND =================

        if (interaction.isChatInputCommand()) {

            if (interaction.commandName === 'inventaire') {

                return interaction.reply({
                    embeds: [createMainEmbed()],
                    components: [
                        ...createButtons(),
                        createCategoryMenu()
                    ]
                });

            }

        }

        // ================= BUTTONS =================

        if (interaction.isButton()) {

            // VIEW STOCK

            if (interaction.customId === 'view_stock') {

                const rows = db.prepare(`
                    SELECT * FROM stocks
                    ORDER BY category ASC, item ASC
                `).all();

                if (rows.length === 0) {

                    return interaction.reply({
                        content: '📦 Aucun stock enregistré.',
                        flags: InteractionResponseFlags.Ephemeral
                    });

                }

                let description = '';

                rows.forEach(row => {

                    description += `
${categories[row.category]} **${row.item}**
└ 📦 ${row.quantity}

`;

                });

                const embed = new EmbedBuilder()
                    .setTitle('📦 STOCK COMPLET')
                    .setDescription(description)
                    .setColor('#8B0000');

                return interaction.reply({
                    embeds: [embed],
                    flags: InteractionResponseFlags.Ephemeral
                });

            }

            // REFRESH

            if (interaction.customId === 'refresh_stock') {

                return interaction.update({
                    embeds: [createMainEmbed()],
                    components: [
                        ...createButtons(),
                        createCategoryMenu()
                    ]
                });

            }

            // ADD

            if (interaction.customId === 'add_stock') {

                const modal = new ModalBuilder()
                    .setCustomId('add_stock_modal')
                    .setTitle('📥 Ajouter un item');

                const objetInput = new TextInputBuilder()
                    .setCustomId('objet')
                    .setLabel('Nom de l’objet')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const quantiteInput = new TextInputBuilder()
                    .setCustomId('quantite')
                    .setLabel('Quantité')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(objetInput),
                    new ActionRowBuilder().addComponents(quantiteInput)
                );

                return await interaction.showModal(modal);

            }

            // REMOVE

            if (interaction.customId === 'remove_stock') {

                const modal = new ModalBuilder()
                    .setCustomId('remove_stock_modal')
                    .setTitle('📤 Retirer un item');

                const objetInput = new TextInputBuilder()
                    .setCustomId('objet')
                    .setLabel('Nom de l’objet')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const quantiteInput = new TextInputBuilder()
                    .setCustomId('quantite')
                    .setLabel('Quantité')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(objetInput),
                    new ActionRowBuilder().addComponents(quantiteInput)
                );

                return await interaction.showModal(modal);

            }

            // DELETE

            if (interaction.customId === 'delete_stock') {

                const modal = new ModalBuilder()
                    .setCustomId('delete_stock_modal')
                    .setTitle('🗑️ Supprimer un item');

                const objetInput = new TextInputBuilder()
                    .setCustomId('objet')
                    .setLabel('Nom de l’objet')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(objetInput)
                );

                return await interaction.showModal(modal);

            }

            // SEARCH

            if (interaction.customId === 'search_stock') {

                const modal = new ModalBuilder()
                    .setCustomId('search_stock_modal')
                    .setTitle('🔍 Rechercher un item');

                const objetInput = new TextInputBuilder()
                    .setCustomId('objet')
                    .setLabel('Nom de l’objet')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(objetInput)
                );

                return await interaction.showModal(modal);

            }

        }

        // ================= MODALS =================

        if (interaction.isModalSubmit()) {

            // ADD

            if (interaction.customId === 'add_stock_modal') {

                const objet = interaction.fields.getTextInputValue('objet');

                const quantite = parseInt(
                    interaction.fields.getTextInputValue('quantite')
                );

                pendingAdds.set(interaction.user.id, {
                    objet,
                    quantite
                });

                return interaction.reply({
                    content: '📂 Choisis une catégorie :',
                    components: [
                        createCategoryMenu('add_category_select')
                    ],
                    flags: InteractionResponseFlags.Ephemeral
                });

            }

            // REMOVE

            if (interaction.customId === 'remove_stock_modal') {

                const objet = interaction.fields.getTextInputValue('objet');

                const quantite = parseInt(
                    interaction.fields.getTextInputValue('quantite')
                );

                const item = db.prepare(`
                    SELECT * FROM stocks
                    WHERE item = ?
                `).get(objet);

                if (!item) {

                    return interaction.reply({
                        content: '❌ Item introuvable.',
                        flags: InteractionResponseFlags.Ephemeral
                    });

                }

                let newQuantity = item.quantity - quantite;

                if (newQuantity < 0) {
                    newQuantity = 0;
                }

                db.prepare(`
                    UPDATE stocks
                    SET quantity = ?
                    WHERE item = ?
                `).run(newQuantity, objet);

                const embed = new EmbedBuilder()
                    .setTitle('📤 STOCK RETIRÉ')
                    .setDescription(`
👤 Membre : ${interaction.user}

📦 Item : **${objet}**
➖ Quantité : **${quantite}**
📉 Nouveau stock : **${newQuantity}**
`)
                    .setColor('Red');

                interaction.reply({
                    embeds: [embed]
                });

            }

            // DELETE

            if (interaction.customId === 'delete_stock_modal') {

                const objet = interaction.fields.getTextInputValue('objet');

                db.prepare(`
                    DELETE FROM stocks
                    WHERE item = ?
                `).run(objet);

                const embed = new EmbedBuilder()
                    .setTitle('🗑️ ITEM SUPPRIMÉ')
                    .setDescription(`
👤 Membre : ${interaction.user}

📦 ${objet} supprimé du stock.
`)
                    .setColor('DarkRed');

                return interaction.reply({
                    embeds: [embed]
                });

            }

            // SEARCH

            if (interaction.customId === 'search_stock_modal') {

                const objet = interaction.fields.getTextInputValue('objet');

                const item = db.prepare(`
                    SELECT * FROM stocks
                    WHERE item LIKE ?
                `).get(`%${objet}%`);

                if (!item) {

                    return interaction.reply({
                        content: '❌ Aucun item trouvé.',
                        flags: InteractionResponseFlags.Ephemeral
                    });

                }

                const embed = new EmbedBuilder()
                    .setTitle('🔍 ITEM TROUVÉ')
                    .setDescription(`
📦 Item : **${item.item}**
📊 Quantité : **${item.quantity}**
📂 Catégorie : **${categories[item.category]}**
`)
                    .setColor('Blue');

                return interaction.reply({
                    embeds: [embed],
                    flags: InteractionResponseFlags.Ephemeral
                });

            }

        }

        // ================= SELECT MENUS =================

        if (interaction.isStringSelectMenu()) {

            // VIEW CATEGORY

            if (interaction.customId === 'category_select') {

                const category = interaction.values[0];

                const rows = db.prepare(`
                    SELECT * FROM stocks
                    WHERE category = ?
                    ORDER BY item ASC
                `).all(category);

                let description = '';

                if (rows.length === 0) {

                    description = '📦 Aucun item dans cette catégorie.';

                } else {

                    rows.forEach(row => {

                        description += `
📦 **${row.item}**
└ Quantité : ${row.quantity}

`;

                    });

                }

                const embed = new EmbedBuilder()
                    .setTitle(`${categories[category]}`)
                    .setDescription(description)
                    .setColor('#8B0000');

                return interaction.reply({
                    embeds: [embed],
                    flags: InteractionResponseFlags.Ephemeral
                });

            }

            // ADD CATEGORY SELECT

            if (interaction.customId === 'add_category_select') {

                const category = interaction.values[0];

                const pending = pendingAdds.get(interaction.user.id);

                if (!pending) {

                    return interaction.reply({
                        content: '❌ Données expirées.',
                        flags: InteractionResponseFlags.Ephemeral
                    });

                }

                const item = db.prepare(`
                    SELECT * FROM stocks
                    WHERE item = ?
                `).get(pending.objet);

                if (item) {

                    db.prepare(`
                        UPDATE stocks
                        SET quantity = ?
                        WHERE item = ?
                    `).run(item.quantity + pending.quantite, pending.objet);

                } else {

                    db.prepare(`
                        INSERT INTO stocks(item, quantity, category)
                        VALUES(?, ?, ?)
                    `).run(
                        pending.objet,
                        pending.quantite,
                        category
                    );

                }

                pendingAdds.delete(interaction.user.id);

                const embed = new EmbedBuilder()
                    .setTitle('📥 STOCK AJOUTÉ')
                    .setDescription(`
👤 Membre : ${interaction.user}

📦 Item : **${pending.objet}**
➕ Quantité : **${pending.quantite}**
📂 Catégorie : **${categories[category]}**
`)
                    .setColor('Green');

                return interaction.update({
                    content: '',
                    embeds: [embed],
                    components: []
                });

            }

        }

    } catch (err) {

        console.error(err);

    }

});

// ================= LOGIN =================

client.login(config.token);